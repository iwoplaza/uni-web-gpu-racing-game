import wgsl from '../wgsl';

export const box2 = wgsl.fn('box2')`(p: vec2f, b: vec2f) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}`;
