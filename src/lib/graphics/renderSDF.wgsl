struct Material {
  color: vec3f,
  roughness: f32,
  emissive: bool,
}

struct MarchResult {
  position: vec3f,
  material: Material,
  normal: vec3f,
}

struct SceneInfo {
  num_of_shapes: u32
}

const WIDTH = {{WIDTH}};
const HEIGHT = {{HEIGHT}};
const BLOCK_SIZE = {{BLOCK_SIZE}};
const WHITE_NOISE_BUFFER_SIZE = {{WHITE_NOISE_BUFFER_SIZE}};
const PI = 3.14159265359;
const PI2 = 2. * PI;
const MAX_STEPS = 1000;
const SURFACE_DIST = 0.001;
const SUPER_SAMPLES = 4;
const SUB_SAMPLES = 1;
const MAX_REFL = 1u;
const FAR = 100.;

{{SHAPE_KIND_DEFINITIONS}}

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

@group(1) @binding(0) var output_tex: texture_storage_2d<{{OUTPUT_FORMAT}}, write>;

@group(2) @binding(0) var<storage, read> view_matrix: mat4x4<f32>;
@group(2) @binding(1) var<storage, read> scene_info: SceneInfo;
@group(2) @binding(2) var<storage, read> scene_shapes: array<SceneShape, MAX_INSTANCES>;

const MATERIAL_NORMAL_TEST = 100;

fn convert_rgb_to_y(rgb: vec3f) -> f32 {
  return 16./255. + (64.738 * rgb.r + 129.057 * rgb.g + 25.064 * rgb.b) / 255.;
}

fn randf(seed: ptr<function, u32>) -> f32 {
  let curr_seed = (*seed + 1) % WHITE_NOISE_BUFFER_SIZE;

  *seed = curr_seed;

  return white_noise_buffer[curr_seed];
}

fn rand_in_unit_cube(seed: ptr<function, u32>) -> vec3f {
  return vec3f(
    randf(seed) * 2. - 1.,
    randf(seed) * 2. - 1.,
    randf(seed) * 2. - 1.,
  );
}

fn rand_in_circle(seed: ptr<function, u32>) -> vec2f {
  let radius = sqrt(randf(seed));
  let angle = randf(seed) * 2 * PI;

  return vec2f(
    cos(angle) * radius,
    sin(angle) * radius,
  );
}

fn rand_on_hemisphere(seed: ptr<function, u32>, normal: vec3f) -> vec3f {
  var value = rand_in_unit_cube(seed);

  if (dot(normal, value) < 0.) {
    value *= -1.;
  }

  value += normal * 0.1;
  
  return normalize(value);
}

// -- SDF

/**
 * Inflates the passed in field, and makes it rounded as
 * a side-effect.

 * @returns 3d sdf
 */
fn op_round(d: f32, r: f32) -> f32 {
  return d - r;
}

/**
 * @returns 2d coordinates
 */
fn op_revolve_y(p: vec3f, offset: f32) -> vec2f {
  return vec2(length(p.xz) - offset, p.y);
}

/**
 * @returns 2d coordinates
 */
fn op_revolve_x(p: vec3f, offset: f32) -> vec2f {
  return vec2(p.x, length(p.yz) - offset);
}

fn sdf2_box(p: vec2f, b: vec2f) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sdf_wheel(pos: vec3f) -> f32 {
  let pos2 = op_revolve_x(pos, 0.5);

  return min(
    op_round(
      sdf2_box(pos2, vec2f(0.2)),
      0.2 // roundness
    ),
      // union with
    min(
      op_round(
        sdf2_box(pos2 + vec2f(0.25, -0.25), vec2f(0.2, 0.05)),
        0.05
      ),
      // union with
      op_round(
        sdf2_box(pos2 + vec2f(0.22, -0.04), vec2f(0.2, 0.01)),
        0.02
      )
    )
  );
}

fn sdf_sphere(pos: vec3f, o: vec3f, r: f32) -> f32 {
  return distance(pos, o) - r;
}

fn sdf_scene_shape(pos: vec3f, idx: u32) -> f32 {
  let kind = scene_shapes[idx].kind;
  let t_pos = scene_shapes[idx].transform * vec4f(pos, 1.0);

  if (kind == SHAPE_SPHERE) {
    return sdf_sphere(t_pos.xyz, vec3f(0., 0., 0.), 1);
  }
  else if (kind == SHAPE_CAR_WHEEL) {
    return sdf_wheel(t_pos.xyz);
  }

  return FAR;
}

fn sdf_world(pos: vec3f) -> f32 {
  var min_dist = FAR;
  var inf_limit = 100;

  for (var idx = 0u; idx < scene_info.num_of_shapes; idx++) {
    let obj_dist = sdf_scene_shape(pos, idx);
    if (obj_dist < min_dist) {
      min_dist = obj_dist;
    }

    inf_limit -= 1;
    if (inf_limit <= 0) {
      // TOO MANY ITERATIONS
      break;
    }
  }

  return min_dist;
}

fn sky_color(dir: vec3f) -> vec3f {
  let t = dir.y / 2. + 0.5;
  
  let uv = floor(30.0 * dir.xy);
  let c = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));

  return mix(
    vec3f(0.1, 0.15, 0.5),
    vec3f(0.7, 0.9, 1),
    t,
  ) * mix(1., 0., c);
}

fn material_world(pos: vec3f, normal: vec3f, ao: f32, out: ptr<function, Material>) {
  // assuming sky, replacing later
  (*out).emissive = true;
  (*out).color = sky_color(normalize(pos));

  var mat_idx = -1;
  var min_dist = FAR;
  var inf_limit = 100;

  for (var idx = 0u; idx < scene_info.num_of_shapes; idx++) {
    let obj_dist = sdf_scene_shape(pos, idx);
    if (obj_dist < min_dist) {
      min_dist = obj_dist;
      mat_idx = i32(scene_shapes[idx].material_idx);
    }

    inf_limit -= 1;
    if (inf_limit <= 0) {
      // TOO MANY ITERATIONS
      break;
    }
  }

  if (mat_idx != -1) { // not sky
    if (mat_idx == 0) {
      // TIRE
      (*out).emissive = false;
      (*out).roughness = 1;
      (*out).color = vec3f(1, 0.9, 0.8) * ao;
    }
    else if (mat_idx == 1) {
      (*out).emissive = false;
      (*out).roughness = 0.;
      (*out).color = vec3f(0.5, 0.7, 1);
    }
    else if (mat_idx == 2) {
      (*out).emissive = true;
      (*out).color = vec3f(0.5, 1, 0.7) * 10;
    }
    else if (mat_idx == MATERIAL_NORMAL_TEST) {
      (*out).emissive = false;
      (*out).roughness = 1.;
      (*out).color = vec3f(normal.x + 0.5, normal.y + 0.5, normal.z + 0.5);
    }
  }
}

fn world_normals(point: vec3f) -> vec3f {
  let epsilon = SURFACE_DIST * 0.1; // arbitrary - should be smaller than any surface detail in your distance function, but not so small as to get lost in float precision
  let offX = vec3f(point.x + epsilon, point.y, point.z);
  let offY = vec3f(point.x, point.y + epsilon, point.z);
  let offZ = vec3f(point.x, point.y, point.z + epsilon);
  
  let centerDistance = sdf_world(point);
  let xDistance = sdf_world(offX);
  let yDistance = sdf_world(offY);
  let zDistance = sdf_world(offZ);

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

  for (; step <= MAX_STEPS; step++) {
    pos = ray_pos + ray_dir * progress;
    min_dist = sdf_world(pos);

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

    if (progress > FAR)
    {
      // Stop checking.
      break;
    }

    prev_dist = min_dist;
  }

  (*out).position = pos;

  // Not near surface or distance rising?
  if (min_dist > SURFACE_DIST * 2. || min_dist > prev_dist)
  {
    // Sky
    (*out).material.color = sky_color(ray_dir);
    (*out).material.emissive = true;
    (*out).normal = -ray_dir;
    return;
  }

  var material: Material;
  (*out).normal = world_normals(pos);
  
  // approximating ambient occlusion
  var ao = max(0, f32(step));
  ao = ao / (1 + ao);
  ao = 1 - pow(ao, 20);
  material_world(pos, (*out).normal, ao, &material);
  (*out).material = material;
}

@compute @workgroup_size(BLOCK_SIZE, BLOCK_SIZE, 1)
fn main_frag(
  @builtin(local_invocation_id) LocalInvocationID: vec3<u32>,
  @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>,
) {
  let lid = LocalInvocationID.xy;
  let parallel_idx = LocalInvocationID.y * BLOCK_SIZE + LocalInvocationID.x;

  // var seed = (GlobalInvocationID.x * 17) + GlobalInvocationID.y * (WIDTH) + GlobalInvocationID.z * (WIDTH * HEIGHT) + u32(time * 0.005) * 3931;
  var seed = (GlobalInvocationID.x + GlobalInvocationID.y * (WIDTH) + GlobalInvocationID.z * (WIDTH * HEIGHT)) * (SUPER_SAMPLES * SUPER_SAMPLES * SUB_SAMPLES * MAX_REFL * 3 + 1 + u32(time));

  var acc = vec3f(0., 0., 0.);
  var march_result: MarchResult;
  var ray_pos = vec3f(0, 0, 0);
  var ray_dir = vec3f(0, 0, 1);

  for (var sx = 0; sx < SUPER_SAMPLES; sx++) {
    for (var sy = 0; sy < SUPER_SAMPLES; sy++) {
      let offset = vec2f(
        f32(sx) / SUPER_SAMPLES,
        f32(sy) / SUPER_SAMPLES,
      );
      
      for (var ss = 0u; ss < SUB_SAMPLES; ss++) {
        construct_ray(vec2f(GlobalInvocationID.xy) + offset, &ray_pos, &ray_dir);
        
        var sub_acc = vec3f(1., 1., 1.);

        for (var refl = 0u; refl < MAX_REFL; refl++) {
          march(ray_pos, ray_dir, &march_result);

          sub_acc *= march_result.material.color;
          // sub_acc *= march_result.normal;

          if (march_result.material.emissive) {
            break;
          }

          // Reflecting: 𝑟=𝑑−2(𝑑⋅𝑛)𝑛
          let dn2 = 2. * dot(ray_dir, march_result.normal);
          let refl_dir = ray_dir - dn2 * march_result.normal;

          ray_pos = march_result.position;
          ray_dir = rand_on_hemisphere(&seed, march_result.normal);
          ray_dir = mix(refl_dir, ray_dir, march_result.material.roughness);
          ray_dir = normalize(ray_dir);
        }

        acc += sub_acc;
      }
    }
  }

  acc /= SUB_SAMPLES * SUPER_SAMPLES * SUPER_SAMPLES;

  textureStore(output_tex, GlobalInvocationID.xy, vec4(acc, 1.0));
}
