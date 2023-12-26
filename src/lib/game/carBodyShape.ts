import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '../graphics/sceneInfo';
import wgsl from '../graphics/wgsl';
import { op, sdf, snippets } from '../graphics/sdf';

const shapeCode = wgsl`
  ${snippets.applyTransform}

  return ${op.union}(
    ${sdf.box3}(pos, vec3f(0.8, 0.3, 2)),
    ${op.inflate}(
      ${sdf.box3}(pos + vec3f(0, 0.2, -3.5), vec3f(1, 0.07, .3)),
      0.5
    ),
  );
`;

export class CarBodyShape implements Shape {
  kind = CarBodyShape;

  _parentMatrix = [...mat4.identity().values()];
  position = [0, 0, 0];

  constructor(pos: [number, number, number]) {
    this.position = pos;
  }

  set parentMatrix(value: Mat4) {
    mat4.copy(value, this._parentMatrix);
  }

  get data(): Readonly<ShapeData> {
    const transform = mat4.identity();
    mat4.scale(transform, vec3.fromValues(1, 1, 1), transform);
    mat4.translate(transform, vec3.negate(this.position), transform);

    mat4.mul(transform, this._parentMatrix, transform);

    return {
      materialIdx: 1,
      extra1: 0,
      extra2: 0,
      transform: [...transform.values()]
    };
  }

  static get shapeCode() {
    return shapeCode;
  }
}
