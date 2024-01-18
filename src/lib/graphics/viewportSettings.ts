import { mat4 } from 'wgpu-matrix';

import type RendererContext from './rendererCtx';
import { diffResolution } from './rendererCtx';

class ViewportSettings {
  private prevResolution: [number, number] | undefined;
  private projMatrix = mat4.identity() as Float32Array;

  constructor(private readonly device: GPUDevice) {}

  prepare(ctx: RendererContext) {
    if (this.prevResolution && !diffResolution(this.prevResolution, ctx.targetResolution)) {
      return;
    }

    this.prevResolution = [...ctx.targetResolution];
    const aspect = ctx.targetResolution[0] / ctx.targetResolution[1];
    this.projMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 2000.0) as Float32Array;
  }

  writeToBuffer(buffer: GPUBuffer, offset: number): void {
    this.device.queue.writeBuffer(
      buffer,
      offset,
      this.projMatrix.buffer,
      this.projMatrix.byteOffset,
      this.projMatrix.byteLength
    );
  }
}

export default ViewportSettings;
