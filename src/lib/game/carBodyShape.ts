import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '../graphics/sceneInfo';
import wgsl from '../graphics/wgsl';
import { macros, op, sdf, snippets } from '../graphics/sdf';
import { lambert } from '../graphics/wgslMaterial';

const spoiler1Origin = wgsl.constant('vec3f(0., 0.7, -1.8)');
const spoiler1Size = wgsl.constant('vec3f(0.8, 0.15, 0.03)');

const spoiler = wgsl.fn('sdf_spoiler')`(pos: vec3f) -> f32 {
  var pos2d = pos.xy;
  pos2d.x = abs(pos2d.x) - 0.8;
  pos2d.y += 0.1;

  let side_d2 = ${macros.union([
    wgsl`${sdf.lineSegment2}(pos2d, vec2f(0, .6), vec2f(0, 0.8))`,
    wgsl`${sdf.lineSegment2}(pos2d, vec2f(-0.2, .5), vec2f(0, .6))`,
    wgsl`${sdf.lineSegment2}(pos2d, vec2f(-0.2, .1), vec2f(-.2, .5))`
    //
  ])};
  return ${macros.union([
    wgsl`${sdf.box3}(pos - ${spoiler1Origin}, ${spoiler1Size})`,
    wgsl`${op.extrude}(side_d2 - 0.02, pos.z + 1.8, 0.2)`
  ])};
}`;

const body = wgsl.fn('sdf_body')`(pos: vec3f) -> f32 {
  let tall_and_floor = ${op.smin}(
    ${op.inflate}(${sdf.box3}(pos, vec3f(0.3, 0.07, 1.8)), 0.3),
    ${op.inflate}(${sdf.box3}(pos - vec3f(0, -.15, 0), vec3f(0.9, 0.02, 0.8)), 0.2),
    0.4,
  );

  return ${op.smin}(
    tall_and_floor,
    ${op.inflate}(${sdf.box3}(pos - vec3f(0, 0.4, -0.2), vec3f(0.2, 0.1, 0.6)), 0.2),
    0.3,
  );
}`;

export class CarBodyShape implements Shape {
  kind = CarBodyShape;

  _parentMatrix = [...mat4.identity().values()];
  position = [0, 0, 0];
  color: [number, number, number];

  constructor(pos: [number, number, number], color: string) {
    this.position = pos;
    const toRGBArray = (rgbStr: string) => rgbStr.match(/\d+/g).map(Number);
    this.color = toRGBArray(color) as [number, number, number];
  }

  set parentMatrix(value: Mat4) {
    mat4.copy(value, this._parentMatrix);
  }

  get data(): Readonly<ShapeData> {
    const transform = mat4.identity();
    mat4.scale(transform, vec3.fromValues(1, 1, 1), transform);
    mat4.translate(transform, vec3.negate(this.position), transform);

    mat4.mul(transform, this._parentMatrix, transform);

    const packedColor =
      (Math.floor(this.color[0]) << 16) |
      (Math.floor(this.color[1]) << 8) |
      Math.floor(this.color[2]);

    return {
      flags: 0,
      extra1: packedColor,
      extra2: 0,
      transform: [...transform.values()]
    };
  }

  static shapeCode = wgsl`
  ${snippets.applyTransform}

  return ${macros.union([wgsl`${spoiler}(pos)`, wgsl`${body}(pos)`])};
`;

  static materialCode = wgsl`
        var rgb = scene_shapes[shape_idx].extra1;
        var r = (rgb >> 16) & 0xFF;
        var g = (rgb >> 8) & 0xFF;
        var b = rgb & 0xFF;
        ${lambert}(ctx, vec3f(f32(r) / 255.0, f32(g) / 255.0, f32(b) / 255.0), out);
  `;
}
