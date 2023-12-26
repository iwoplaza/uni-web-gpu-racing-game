import wgsl from '../wgsl';

export const lambertWGSL = wgsl.fn(
  'mat_lambert'
)`(ctx: ptr<function, EnvContext>, albedo: vec3f, out: ptr<function, Material>) {
  (*out).color = (AMBIENT_COLOR + albedo * SUN_COLOR * (*ctx).attenuation) * (*ctx).ao;
}`;
