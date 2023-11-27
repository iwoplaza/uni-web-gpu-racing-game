import { mat4, vec3 } from 'wgpu-matrix';

class CameraSettings {
	public gpuBuffer: GPUBuffer;
	/**
	 * Transform of the camera, not of everything else like in standard rendering.
	 */
	private viewMatrix = mat4.identity() as Float32Array;

	constructor(private readonly device: GPUDevice) {
		this.gpuBuffer = device.createBuffer({
			size: 16 * 4, // mat4x4<f32>,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		});
	}

	update() {
		const origin = vec3.fromValues(0, 0, 0);
		// const rad = Math.PI / 4;
		const rad = Math.PI * (Date.now() / 5000);

		const viewMatrix = mat4.identity();
		mat4.translate(viewMatrix, origin, viewMatrix);
		mat4.rotateY(viewMatrix, rad, viewMatrix);
		mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
		this.viewMatrix = viewMatrix as Float32Array;
	}

	queueWrite(): void {
		this.device.queue.writeBuffer(
			this.gpuBuffer, // dest
			0, // dest offset
			this.viewMatrix.buffer, // src
			this.viewMatrix.byteOffset, // src offset
			this.viewMatrix.byteLength // size
		);
	}
}

export default CameraSettings;
