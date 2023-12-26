import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '../graphics/sceneInfo';
import wgsl from '../graphics/wgsl';
import { op, sdf, snippets } from '../graphics/sdf';

const shapeCode = wgsl`
  ${snippets.applyTransform}

  let pos2 = ${op.revolveX}(pos, 0.5);

  return ${op.union}(
    ${op.inflate}(
      ${sdf.box2}(pos2, vec2f(0.2)),
      0.2 // roundness
    ),
    // union with
    ${op.union}(
      ${op.inflate}(
        ${sdf.box2}(pos2 + vec2f(0.25, -0.25), vec2f(0.2, 0.05)),
        0.05
      ),
      // union with
      ${op.inflate}(
        ${sdf.box2}(pos2 + vec2f(0.22, -0.04), vec2f(0.2, 0.01)),
        0.02
      )
    )
  );
`;

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
      materialIdx: 0,
      extra1: 0,
      extra2: 0,
      transform: [...transform.values()]
    };
  }

  static get shapeCode() {
    return shapeCode;
  }
}