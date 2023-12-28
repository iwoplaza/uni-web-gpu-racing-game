import wgsl from './wgsl';

export const normalTest = wgsl.fn(
  'mat_normal_test'
)`(ctx: ptr<function, MatContext>, out: ptr<function, Material>) {
  let n = (*ctx).normal;
  (*out).color = n + vec3f(.5, .5, .5);
}`;

export const SunDir = wgsl.param('Sun Direction', 'normalize(vec3f(-0.5, 1., -0.2))');
export const LambertSunColor = wgsl.param('Lambert Sun Color', 'vec3f(1., 0.95, 0.8)');
export const LambertAmbientColor = wgsl.param('Lambert Ambient Color', 'vec3f(0.19, 0.2, 0.23)');

export const lambert = wgsl.fn(
  'mat_lambert'
)`(ctx: ptr<function, MatContext>, albedo: vec3f, out: ptr<function, Material>) {
  (*out).color = (${LambertAmbientColor} + albedo * ${LambertSunColor} * (*ctx).attenuation) * (*ctx).ao;
}`;

export const checkerboard = wgsl.fn('pat_checkerboard')`(dir: vec2f, scale: f32) -> f32 {
  let uv = floor(scale * dir);
  return 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
}`;
