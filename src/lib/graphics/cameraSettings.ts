import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import { UNIFORM } from './wgsl';
import * as std140 from './std140';
import type RendererContext from './rendererCtx';

export const viewMatrixMemory = UNIFORM.allocate('View Matrix', 'mat4f', std140.mat4f);

class CameraSettings {
  private _parentMatrix = mat4.identity();
  public origin: [number, number, number] = [0, 2, 0];
  public distance: number = 5;

  constructor() {}

  set parentMatrix(value: Mat4) {
    mat4.copy(value, this._parentMatrix);
  }

  /**
   * Transform of the camera, not of everything else like in standard rendering.
   */
  get viewMatrix() {
    const viewMatrix = mat4.identity();

    // parent matrix
    mat4.mul(mat4.inverse(this._parentMatrix), viewMatrix, viewMatrix);

    // const rad = Math.PI / 4;
    // const rad = Date.now() * 0.001;
    // mat4.rotateY(viewMatrix, rad, viewMatrix);
    mat4.translate(viewMatrix, this.origin, viewMatrix);
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -this.distance), viewMatrix);

    return viewMatrix;
  }

  prepare(ctx: RendererContext): void {
    viewMatrixMemory.write(ctx.runtime, [...this.viewMatrix.values()]);
  }
}

export default CameraSettings;
