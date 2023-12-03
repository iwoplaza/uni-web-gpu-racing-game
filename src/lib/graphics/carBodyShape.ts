import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import { ShapeKind, type Shape, type ShapeStruct } from './sceneInfo';

export class CarBodyShape implements Shape {
  _parentMatrix = [...mat4.identity().values()];
  position = [0, 0, 0];

  constructor(pos: [number, number, number]) {
    this.position = pos;
  }

  set parentMatrix(value: Mat4) {
    mat4.copy(value, this._parentMatrix);
  }

  get data(): Readonly<ShapeStruct> {
    const transform = mat4.identity();
    mat4.scale(transform, vec3.fromValues(1, 1, 1), transform);
    mat4.translate(transform, vec3.negate(this.position), transform);

    mat4.mul(transform, this._parentMatrix, transform);

    return {
      kind: ShapeKind.CAR_BODY,
      materialIdx: 1,
      extra1: 0,
      extra2: 0,
      transform: [...transform.values()]
    };
  }
}
