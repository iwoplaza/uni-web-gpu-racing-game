import { mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '../graphics/sceneInfo';
import { checkerboard, lambert } from '../graphics/wgslMaterial';
import * as std140 from '../graphics/std140';
import { macros, op, sdf } from '../graphics/sdf';
import wgsl from '../graphics/wgsl';

export const MaxRoadAnchors = 64;
export const roadAnchorsCount = wgsl.readonlyStorage('road_anchors_count', 'u32', std140.u32);
export const roadAnchorsBuffer = wgsl.readonlyStorage(
  'road_anchors',
  `array<vec2f, ${MaxRoadAnchors}>`,
  std140.arrayOf(std140.vec2f, MaxRoadAnchors)
);

export const MaxNoGrassZones = 64;
export const noGrassZonesCount = wgsl.readonlyStorage('no_grass_zones_count', 'u32', std140.u32);
export const noGrassZones = wgsl.readonlyStorage(
  'no_grass_zones',
  `array<vec4f, ${MaxNoGrassZones}>`,
  std140.arrayOf(std140.vec4f, MaxNoGrassZones)
);

const noGrassSDF = wgsl.fn('no_grass_sdf')`(pos: vec2f) -> f32 {
  var min_dist = FAR;

  for (var i = 0u; i < ${noGrassZonesCount}; i += 1) {
    let zone = ${noGrassZones}[i];
    min_dist = min(min_dist, ${sdf.box2}(pos - zone.xy, zone.zw));
  }

  return min_dist;
}`;

export const roadSplineSDF = wgsl.fn('whole_road')`(pos: vec2f) -> f32 {
  var min_dist = FAR;

  for (var i = 0u; i < ${roadAnchorsCount}; i += 4) {
    let A = ${roadAnchorsBuffer}[i];
    let B = ${roadAnchorsBuffer}[i + 1];
    let C = ${roadAnchorsBuffer}[i + 2];
    let D = ${roadAnchorsBuffer}[i + 3];

    let d_bezier = ${sdf.cubicBezier2}(pos, A, B, C, D);

    min_dist = min(min_dist, d_bezier);
  }

  return min_dist;
}`;

const treeSDF = wgsl.fn('tree_sdf')`(pos: vec3f) -> f32 {
  return ${macros.union([
    // wgsl`${sdf.box3}(pos - vec3f(0, 0, 0), vec3f(1, 20, 1))` //
    wgsl`${sdf.sphere}(pos, vec3f(0, 0, 0), 3)` //
  ])};
}`;

const chunkSDF = wgsl.fn('chunk_sdf')`(pos: vec3f, chunk_pos: vec3f) -> f32 {
  var min_dist = pos.y; // ground

  let d_no_grass = ${noGrassSDF}(chunk_pos.xz);
  if (d_no_grass > 1) {
    let d_tree = ${treeSDF}(pos - chunk_pos);
    min_dist = min(min_dist, d_tree);
  }

  return min_dist;
}`;

class StaticEnvironmentShape implements Shape {
  kind = StaticEnvironmentShape;

  get data(): Readonly<ShapeData> {
    return {
      flags: 0,
      extra1: 0,
      extra2: 0,
      transform: [...mat4.identity().values()]
    };
  }

  static shapeCode = wgsl`
  var min_dist = pos.y; // ground

  let chunk_size = vec2f(20, 20);
  let chunk_pos = ${op.repeatXZ}(pos, chunk_size);

  return ${macros.union([
    wgsl`${chunkSDF}(pos, chunk_pos)`
    // wgsl`${chunkSDF}(pos, chunk_pos + vec3f(-chunk_size[0], 0, 0))`,
    // wgsl`${chunkSDF}(pos, chunk_pos + vec3f(chunk_size[0], 0, 0))`,
    // wgsl`${chunkSDF}(pos, chunk_pos + vec3f(0, 0, -chunk_size[0]))`,
    // wgsl`${chunkSDF}(pos, chunk_pos + vec3f(0, 0, chunk_size[0]))`
  ])};
  `;
  static materialCode = wgsl`
  let d_track = ${roadSplineSDF}(pos.xz);

  let t = max(0., 0.4 - pow(abs(d_track - 12), 4));
  var albedo = mix(vec3f(0.4, 0.4, 0.4), vec3f(1., 1., 1.), t);

  if (d_track < 15.) {
    ${lambert}(ctx, albedo, out);
  }
  else {
    ${lambert}(ctx, ${checkerboard}(pos.xz, 0.2) * vec3f(0.3, 0.6, 0.3), out);
  }
  `;
}

export default StaticEnvironmentShape;
