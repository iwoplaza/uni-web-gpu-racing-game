import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

class CameraSettings {
  private _parentMatrix = mat4.identity();
  public origin: [number, number, number] = [0, 1, 0];
  public distance: number = 9;

  public gpuBuffer: GPUBuffer;

  constructor(private readonly device: GPUDevice) {
    this.gpuBuffer = device.createBuffer({
      size: 16 * 4, // mat4x4<f32>,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
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
    // console.log(mat4.getTranslation(this._parentMatrix));
    mat4.mul(mat4.inverse(this._parentMatrix), viewMatrix, viewMatrix);

    mat4.translate(viewMatrix, this.origin, viewMatrix);
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -this.distance), viewMatrix);

    return viewMatrix;
  }

  get worldMatrix() {
    const worldMatrix = mat4.identity();

    mat4.translate(worldMatrix, vec3.fromValues(0, 0, this.distance), worldMatrix);
    mat4.translate(worldMatrix, vec3.negate(this.origin), worldMatrix);

    // parent matrix
    // console.log(mat4.getTranslation(this._parentMatrix));
    mat4.mul(worldMatrix, this._parentMatrix, worldMatrix);

    return worldMatrix;
  }

  queueWrite(): void {
    const viewMatrix = this.viewMatrix as Float32Array;

    this.device.queue.writeBuffer(
      this.gpuBuffer, // dest
      0, // dest offset
      viewMatrix.buffer, // src
      viewMatrix.byteOffset, // src offset
      viewMatrix.byteLength // size
    );
  }
}

export default CameraSettings;
