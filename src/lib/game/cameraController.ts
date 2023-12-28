import type { GameEngineCtx } from '$lib/gameEngineCtx';
import type CameraSettings from '$lib/graphics/cameraSettings';
import { mat4, vec3 } from 'wgpu-matrix';
import type CarObject from './carObject';

export type CameraMode = 'third-person' | 'map';

class CameraController {
  mode: CameraMode = 'third-person';

  constructor(private readonly camera: CameraSettings) {}

  onRender(ctx: GameEngineCtx, spectate: CarObject | undefined) {
    const parentMatrix = mat4.identity();
    if (spectate && this.mode === 'third-person') {
      mat4.copy(spectate.cameraMountMatrix(ctx.pt), parentMatrix);
    } else {
      mat4.rotateX(parentMatrix, -Math.PI / 2, parentMatrix);
      mat4.translate(parentMatrix, vec3.fromValues(0, -220, 0), parentMatrix);
    }
    this.camera.parentMatrix = parentMatrix;
  }
}

export default CameraController;
