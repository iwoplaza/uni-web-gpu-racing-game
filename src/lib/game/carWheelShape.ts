import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '../graphics/sceneInfo';
import wgsl from '../graphics/wgsl';
import { macros, op, sdf, snippets } from '../graphics/sdf';
import { lambert } from '../graphics/wgslMaterial';

export class CarWheelShape implements Shape {
  kind = CarWheelShape;

  _parentMatrix = [...mat4.identity().values()];
  position = [0, 0, 0];
  turnAngle: number = 0;

  constructor(pos: [number, number, number]) {
    this.position = pos;
  }

  set parentMatrix(value: Mat4) {
    mat4.copy(value, this._parentMatrix);
  }

  get data(): Readonly<ShapeData> {
    const transform = mat4.identity();
    mat4.rotateY(transform, -this.turnAngle, transform);
    mat4.scale(transform, vec3.fromValues(1, 1, 1), transform);
    mat4.translate(transform, vec3.negate(this.position), transform);

    mat4.mul(transform, this._parentMatrix, transform);

    return {
      flags: 0,
      extra1: 0,
      extra2: 0,
      transform: [...transform.values()]
    };
  }

  static shapeCode = wgsl`
  ${snippets.applyTransform}

  let pos2 = ${op.revolveX}(pos, 0.25);

  return ${macros.union([
    wgsl`${op.inflate}(
      ${sdf.box2}(pos2, vec2f(0.1)),
      0.1 // roundness
    )`,
    wgsl`${op.inflate}(
      ${sdf.box2}(pos2 + vec2f(0.125, -0.125), vec2f(0.1, 0.025)),
      0.025
    )`,
    wgsl`${op.inflate}(
      ${sdf.box2}(pos2 + vec2f(0.11, -0.02), vec2f(0.1, 0.005)),
      0.01
    )`
  ])};
  `;

  static materialCode = wgsl`
  ${lambert}(ctx, vec3f(0.2, 0.2, 0.2), out);
  `;
}
