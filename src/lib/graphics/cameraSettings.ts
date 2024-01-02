import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

class CameraSettings {
  private _parentMatrix = mat4.identity();
  public origin: [number, number, number] = [0, 2, 0];
  public distance: number = 5;

  private _gpuBuffer: GPUBuffer | undefined = undefined;

  constructor() {}

  init(device: GPUDevice) {
    this._gpuBuffer = device.createBuffer({
      size: 16 * 4, // mat4x4<f32>,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

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

  get gpuBuffer(): GPUBuffer {
    if (!this._gpuBuffer) {
      throw new Error(`Camera Setting have not been initialized`);
    }

    return this._gpuBuffer;
  }

  queueWrite(device: GPUDevice): void {
    const viewMatrix = this.viewMatrix as Float32Array;

    device.queue.writeBuffer(
      this.gpuBuffer, // dest
      0, // dest offset
      viewMatrix.buffer, // src
      viewMatrix.byteOffset, // src offset
      viewMatrix.byteLength // size
    );
  }
}

export default CameraSettings;
