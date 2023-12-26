import wgsl from '../wgsl';

export const box3 = wgsl.fn('box3')`(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0., 0., 0.))) + min(max(q.x, max(q.y, q.z)), 0.0);
}`;
