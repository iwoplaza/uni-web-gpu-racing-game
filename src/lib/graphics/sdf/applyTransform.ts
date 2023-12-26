import wgsl from '../wgsl';

export const applyTransform = wgsl`pos = (scene_shapes[shape_idx].transform * vec4f(pos, 1.0)).xyz;`;
