struct Material {
  color: vec3f,
  emissive: bool,
}

struct MarchResult {
  steps: u32,
  position: vec3f,
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
const SURFACE_DIST = 0.00001;
const SUPER_SAMPLES = 4;
const ONE_OVER_SUPER_SAMPLES = 1. / SUPER_SAMPLES;
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

const MATERIAL_CAR_WHEEL = 0;
const MATERIAL_CAR_BODY = 1;
const MATERIAL_GROUND = 2;
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

fn sdf_box(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0., 0., 0.))) + min(max(q.x, max(q.y, q.z)), 0.0);
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

fn sdf_car_body(pos: vec3f) -> f32 {
  return min(
    sdf_box(pos, vec3f(2, 0.5, 3)),
    op_round(sdf_box(pos + vec3f(0, 0, -5.5), vec3f(2, 0.07, .3)), 0.5),
  );
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
  else if (kind == SHAPE_CAR_BODY) {
    return sdf_car_body(t_pos.xyz);
  }

  return FAR;
}

fn sdf_world(pos: vec3f) -> f32 {
  var min_dist = FAR;
  var inf_limit = MAX_INSTANCES;

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

fn pat_checkerboard(dir: vec2f, scale: f32) -> f32 {
  let uv = floor(scale * dir);
  return 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
}

fn sky_color(dir: vec3f) -> vec3f {
  let t = dir.y / 2. + 0.5;
  let c = pat_checkerboard(dir.xy, 30.);

  return mix(
    vec3f(0.1, 0.15, 0.5),
    vec3f(0.7, 0.9, 1),
    t,
  ) * mix(1., 0., c);
}

const SUN_DIR = normalize(vec3f(-0.5, 1., -0.2));
const SUN_COLOR = vec3f(1., 0.95, 0.8);
const AMBIENT_COLOR = vec3f(0.19, 0.2, 0.23);

fn material_world(pos: vec3f, normal: vec3f, attenuation: f32, ao: f32, out: ptr<function, Material>) {
  (*out).emissive = false;
  (*out).color = vec3f(0., 0., 0.);

  var mat_idx = -1;
  var min_dist = FAR;
  var inf_limit = MAX_INSTANCES;

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
    if (mat_idx == MATERIAL_CAR_WHEEL) {
      (*out).color = (AMBIENT_COLOR + vec3f(1, 1, 1) * SUN_COLOR * attenuation) * ao;
    }
    else if (mat_idx == MATERIAL_CAR_BODY) {
      (*out).color = vec3f(0.5, 0.7, 1);
    }
    else if (mat_idx == MATERIAL_GROUND) {
      (*out).color = vec3f(1, 0, 0);
    }
    else if (mat_idx == MATERIAL_NORMAL_TEST) {
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
        let normal = world_normals(march_result.position);
        // approximating ambient occlusion
        // var ao = max(0, f32(march_result.steps));
        // ao = ao / (1 + ao);
        // ao = 1 - pow(ao, 20);
        let ao = 1.;

        // Marching towards the sun
        march(march_result.position + SUN_DIR * 0.01, SUN_DIR, &sun_march_result);

        var attenuation = select(0., max(0., dot(normal, SUN_DIR)), sun_march_result.steps > MAX_STEPS);
        // var attenuation = f32(sun_march_result.steps / 100);
        
        material_world(march_result.position, normal, attenuation, ao, &material);
      }

      acc += material.color;
    }
  }

  acc *= ONE_OVER_SUPER_SAMPLES * ONE_OVER_SUPER_SAMPLES;

  textureStore(output_tex, GlobalInvocationID.xy, vec4(acc, 1.0));
}
