import wgsl from './wgsl';

export const randf = wgsl.fn('randf')`(seed: ptr<function, u32>) -> f32 {
  let curr_seed = (*seed + 1) % WHITE_NOISE_BUFFER_SIZE;

  *seed = curr_seed;

  return white_noise_buffer[curr_seed];
}`;

export const randInUnitCube = wgsl.fn('rand_in_unit_cube')`(seed: ptr<function, u32>) -> vec3f {
  return vec3f(
    ${randf}(seed) * 2. - 1.,
    ${randf}(seed) * 2. - 1.,
    ${randf}(seed) * 2. - 1.,
  );
}`;

export const randInCircle = wgsl.fn('rand_in_circle')`(seed: ptr<function, u32>) -> vec2f {
  let radius = sqrt(${randf}(seed));
  let angle = ${randf}(seed) * 2 * PI;

  return vec2f(
    cos(angle) * radius,
    sin(angle) * radius,
  );
}`;

export const randOnHemisphere = wgsl.fn(
  'rand_on_hemisphere'
)`(seed: ptr<function, u32>, normal: vec3f) -> vec3f {
  var value = ${randInUnitCube}(seed);

  if (dot(normal, value) < 0.) {
    value *= -1.;
  }

  value += normal * 0.1;
  
  return normalize(value);
}`;
