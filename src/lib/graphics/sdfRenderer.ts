import { preprocessShaderCode } from './preprocessShaderCode';
import { WhiteNoiseBuffer } from './whiteNoiseBuffer';
import { TimeInfoBuffer } from './timeInfoBuffer';
import type GBuffer from './gBuffer';
import type SceneInfo from './sceneInfo';
import wgsl from './wgsl';
import { SunDir, checkerboard } from './wgslMaterial';

const viewportWidthParam = wgsl.param('Viewport Width');
const viewportHeightParam = wgsl.param('Viewport Height');
const outputFormatParam = wgsl.param('Output Format');

const makeShaderCode = (sceneInfo: SceneInfo) => wgsl.code`
struct Material {
  color: vec3f,
  emissive: bool,
}

struct ShapeContext {
  view_dir: vec3f,
}

struct MatContext {
  pos: vec3f,
  view_dir: vec3f,
  normal: vec3f,
  attenuation: f32,
  ao: f32,
}

struct MarchResult {
  steps: u32,
  position: vec3f,
}

struct SceneInfo {
  num_of_shapes: u32
}

const WIDTH = ${viewportWidthParam};
const HEIGHT = ${viewportHeightParam};
const BLOCK_SIZE = {{BLOCK_SIZE}};
const WHITE_NOISE_BUFFER_SIZE = {{WHITE_NOISE_BUFFER_SIZE}};
const PI = 3.14159265359;
const PI2 = 2. * PI;
const MAX_STEPS = 200;
const SURFACE_DIST = 0.01;
const SUPER_SAMPLES = 1;
const ONE_OVER_SUPER_SAMPLES = 1. / SUPER_SAMPLES;
const FAR = 10000.;

const MAX_INSTANCES = 64;

struct SceneShape {
  kind: u32,
  material_idx: u32,
  extra1: u32,
  extra2: u32,
  transform: mat4x4<f32>,
}

@group(0) @binding(0) var<storage, read> white_noise_buffer: array<f32, WHITE_NOISE_BUFFER_SIZE>;
@group(0) @binding(1) var<uniform> time: f32;

@group(1) @binding(0) var output_tex: texture_storage_2d<${outputFormatParam}, write>;

@group(2) @binding(0) var<storage, read> view_matrix: mat4x4<f32>;
@group(2) @binding(1) var<storage, read> scene_info: SceneInfo;
@group(2) @binding(2) var<storage, read> scene_shapes: array<SceneShape, MAX_INSTANCES>;

fn convert_rgb_to_y(rgb: vec3f) -> f32 {
  return 16./255. + (64.738 * rgb.r + 129.057 * rgb.g + 25.064 * rgb.b) / 255.;
}

${sceneInfo.shapeDefinitionsCode}

fn sdf_scene_shape(pos: vec3f, ctx: ptr<function, ShapeContext>, idx: u32) -> f32 {
  let kind = scene_shapes[idx].kind;

  ${sceneInfo.sceneResolverCode}

  return FAR;
}

fn sdf_world(pos: vec3f, ctx: ptr<function, ShapeContext>) -> f32 {
  var min_dist = FAR;

  let instances = min(u32(scene_info.num_of_shapes), MAX_INSTANCES);
  for (var idx = 0u; idx < instances; idx++) {
    min_dist = min(sdf_scene_shape(pos, ctx, idx), min_dist);
  }

  return min_dist;
}

fn sky_color(dir: vec3f) -> vec3f {
  let t = max(0., dir.y);
  // let c = ${checkerboard}(dir.xy, 30.);

  return mix(
    vec3f(0.8, 0.7, 0.5),
    vec3f(0.7, 0.9, 1),
    t,
  );
}

fn material_world(ctx: ptr<function, MatContext>, out: ptr<function, Material>) {
  (*out).emissive = false;
  (*out).color = vec3f(0., 0., 0.);

  var shape_idx = -1;
  var min_dist = FAR;

  var shape_ctx: ShapeContext;
  shape_ctx.view_dir = (*ctx).view_dir;

  let instances = min(u32(scene_info.num_of_shapes), MAX_INSTANCES);
  for (var idx = 0u; idx < instances; idx++) {
    let obj_dist = sdf_scene_shape((*ctx).pos, &shape_ctx, idx);
    if (obj_dist < min_dist) {
      min_dist = obj_dist;
      shape_idx = i32(idx);
    }
  }

  if (shape_idx != -1) { // not sky
    let kind = scene_shapes[shape_idx].kind;

    ${sceneInfo.materialResolverCode}
  }
}

fn world_normals(point: vec3f, ctx: ptr<function, ShapeContext>) -> vec3f {
  let epsilon = SURFACE_DIST * 0.5; // arbitrary - should be smaller than any surface detail in your distance function, but not so small as to get lost in float precision
  let offX = vec3f(point.x + epsilon, point.y, point.z);
  let offY = vec3f(point.x, point.y + epsilon, point.z);
  let offZ = vec3f(point.x, point.y, point.z + epsilon);
  
  let centerDistance = sdf_world(point, ctx);
  let xDistance = sdf_world(offX, ctx);
  let yDistance = sdf_world(offY, ctx);
  let zDistance = sdf_world(offZ, ctx);

  return vec3f(
    (xDistance - centerDistance),
    (yDistance - centerDistance),
    (zDistance - centerDistance),
  ) / epsilon;
}

fn construct_ray(coord: vec2f, out_pos: ptr<function, vec3f>, out_dir: ptr<function, vec3f>) {
  var dir = vec4f(
    (coord / vec2f(WIDTH, HEIGHT)) * 2. - 1.,
    1.,
    0.,
  );

  let hspan = 1.;
  let vspan = 1.;

  dir.x *= hspan;
  dir.y *= -vspan;

  // *out_pos = (vec4f(0, 0, -4, 1)).xyz;
  // *out_dir = normalize((dir).xyz);
  *out_pos = (view_matrix * vec4f(0, 0, 0, 1)).xyz;
  *out_dir = normalize((view_matrix * dir).xyz);
}

fn march(ray_pos: vec3f, ray_dir: vec3f, out: ptr<function, MarchResult>) {
  var pos = ray_pos;
  var prev_dist = -1.;
  var min_dist = FAR;

  var step = 0u;
  var progress = 0.;

  var shape_ctx: ShapeContext;
  shape_ctx.view_dir = ray_dir;

  for (; step <= MAX_STEPS; step++) {
    pos = ray_pos + ray_dir * progress;
    min_dist = sdf_world(pos, &shape_ctx);

    // Inside volume?
    if (min_dist <= 0. && prev_dist > 0.) {
      // No need to check more objects.
      break;
    }

    if (min_dist < SURFACE_DIST && min_dist < prev_dist) {
      // No need to check more objects.
      break;
    }

    // march forward safely
    progress += min_dist;

    if (progress > FAR) {
      // Stop checking.
      break;
    }

    prev_dist = min_dist;
  }

  (*out).position = pos;

  // Not near surface or distance rising?
  if (min_dist > SURFACE_DIST * 2. || min_dist > prev_dist) {
    // Sky
    (*out).steps = MAX_STEPS + 1;
    return;
  }

  (*out).steps = step;
}

@compute @workgroup_size(BLOCK_SIZE, BLOCK_SIZE, 1)
fn main_frag(
  @builtin(local_invocation_id) LocalInvocationID: vec3<u32>,
  @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>,
) {
  let lid = LocalInvocationID.xy;
  let parallel_idx = LocalInvocationID.y * BLOCK_SIZE + LocalInvocationID.x;

  // var seed = (GlobalInvocationID.x * 17) + GlobalInvocationID.y * (WIDTH) + GlobalInvocationID.z * (WIDTH * HEIGHT) + u32(time * 0.005) * 3931;
  var seed = (GlobalInvocationID.x + GlobalInvocationID.y * (WIDTH) + GlobalInvocationID.z * (WIDTH * HEIGHT)) * (SUPER_SAMPLES * SUPER_SAMPLES * 3 + 1 + u32(time));

  var acc = vec3f(0., 0., 0.);
  var march_result: MarchResult;
  var sun_march_result: MarchResult;
  var ray_pos = vec3f(0, 0, 0);
  var ray_dir = vec3f(0, 0, 1);

  for (var sx = 0; sx < SUPER_SAMPLES; sx++) {
    for (var sy = 0; sy < SUPER_SAMPLES; sy++) {
      let offset = vec2f(
        f32(sx) * ONE_OVER_SUPER_SAMPLES,
        f32(sy) * ONE_OVER_SUPER_SAMPLES,
      );
      
      construct_ray(vec2f(GlobalInvocationID.xy) + offset, &ray_pos, &ray_dir);
      
      var sub_acc = vec3f(1., 1., 1.);
      march(ray_pos, ray_dir, &march_result);

      var material: Material;

      if (march_result.steps > MAX_STEPS) {
        material.emissive = true;
        material.color = sky_color(ray_dir);
      }
      else {
        var shape_ctx: ShapeContext;
        shape_ctx.view_dir = ray_dir;
        let normal = world_normals(march_result.position, &shape_ctx);
        // approximating ambient occlusion
        // var ao = max(0, f32(march_result.steps));
        // ao = ao / (1 + ao);
        // ao = 1 - pow(ao, 20);
        let ao = 1.;

        // Marching towards the sun
        march(march_result.position + ${SunDir} * 0.01, ${SunDir}, &sun_march_result);

        var attenuation = select(0., max(0., dot(normal, ${SunDir})), sun_march_result.steps > MAX_STEPS);
        // var attenuation = f32(sun_march_result.steps / 100);

        var mat_ctx: MatContext;
        mat_ctx.pos = march_result.position;
        mat_ctx.view_dir = ray_dir;
        mat_ctx.normal = normal;
        mat_ctx.attenuation = attenuation;
        mat_ctx.ao = ao;
        material_world(&mat_ctx, &material);
      }

      acc += material.color;
    }
  }

  acc *= ONE_OVER_SUPER_SAMPLES * ONE_OVER_SUPER_SAMPLES;

  textureStore(output_tex, GlobalInvocationID.xy, vec4(acc, 1.0));
}
`;

export const SDFRenderer = (device: GPUDevice, gBuffer: GBuffer, sceneInfo: SceneInfo) => {
  const LABEL = `SDF Renderer`;
  const blockDim = 8;
  const whiteNoiseBufferSize = 512 * 512;
  const mainPassSize = gBuffer.rawRender.size;

  const whiteNoiseBuffer = WhiteNoiseBuffer(device, whiteNoiseBufferSize, GPUBufferUsage.STORAGE);
  const timeInfoBuffer = TimeInfoBuffer(device, GPUBufferUsage.UNIFORM);

  const mainBindGroupLayout = device.createBindGroupLayout({
    label: `${LABEL} - Main Bind Group Layout`,
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          format: 'rgba8unorm'
        }
      }
    ]
  });

  const sharedBindGroupLayout = device.createBindGroupLayout({
    label: `${LABEL} - Shared Bind Group Layout`,
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform'
        }
      }
    ]
  });

  const sceneBindGroupLayout = device.createBindGroupLayout({
    label: `${LABEL} - Scene Bind Group Layout`,
    entries: [
      // view_matrix
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      },
      // scene_info
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      },
      // scene_shapes
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      }
    ]
  });

  const sharedBindGroup = device.createBindGroup({
    label: `${LABEL} - Shared Bind Group`,
    layout: sharedBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          label: `${LABEL} - White Noise Buffer`,
          buffer: whiteNoiseBuffer
        }
      },
      {
        binding: 1,
        resource: {
          label: `${LABEL} - Time Info`,
          buffer: timeInfoBuffer.buffer
        }
      }
    ]
  });

  const sceneBindGroup = device.createBindGroup({
    label: `${LABEL} - Scene Bind Group`,
    layout: sceneBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sceneInfo.camera.gpuBuffer
        }
      },
      // scene_info
      {
        binding: 1,
        resource: {
          buffer: sceneInfo.gpuSceneInfoBuffer
        }
      },
      // scene_shapes
      {
        binding: 2,
        resource: {
          buffer: sceneInfo.gpuSceneShapesBuffer
        }
      }
    ]
  });

  const mainBindGroup = device.createBindGroup({
    label: `${LABEL} - Main Bind Group`,
    layout: mainBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: gBuffer.rawRender.view
      }
    ]
  });

  const shaderCode = makeShaderCode(sceneInfo);
  const code = shaderCode.resolve([
    [viewportWidthParam, mainPassSize[0]],
    [viewportHeightParam, mainPassSize[1]],
    [outputFormatParam, 'rgba8unorm']
  ]);

  const mainPipeline = device.createComputePipeline({
    label: `${LABEL} - Main Pipeline`,
    layout: device.createPipelineLayout({
      bindGroupLayouts: [sharedBindGroupLayout, mainBindGroupLayout, sceneBindGroupLayout]
    }),
    compute: {
      module: device.createShaderModule({
        label: `${LABEL} - Main Shader`,
        code: preprocessShaderCode(code, {
          BLOCK_SIZE: `${blockDim}`,
          WHITE_NOISE_BUFFER_SIZE: `${whiteNoiseBufferSize}`
        })
      }),
      entryPoint: 'main_frag'
    }
  });

  return {
    perform(commandEncoder: GPUCommandEncoder) {
      timeInfoBuffer.update();
      sceneInfo.camera.queueWrite(device);

      const mainPass = commandEncoder.beginComputePass();

      mainPass.setPipeline(mainPipeline);
      mainPass.setBindGroup(0, sharedBindGroup);
      mainPass.setBindGroup(1, mainBindGroup);
      mainPass.setBindGroup(2, sceneBindGroup);
      mainPass.dispatchWorkgroups(
        Math.ceil(mainPassSize[0] / blockDim),
        Math.ceil(mainPassSize[1] / blockDim),
        1
      );

      mainPass.end();
    }
  };
};
