import { mat4, vec3 } from 'wgpu-matrix';

class CameraSettings {
	public gpuBuffer: GPUBuffer;
	private invViewMatrix = mat4.identity() as Float32Array;

	constructor(private readonly device: GPUDevice) {
		this.gpuBuffer = device.createBuffer({
			size: 16 * 4, // mat4f,
			usage: GPUBufferUsage.STORAGE
		});
	}

	update() {
		const origin = vec3.fromValues(0, 0, 1);
		const eyePosition = vec3.fromValues(0, 0, 0);
		// const upVector = vec3.fromValues(0, 1, 0);

		const rad = Math.PI * (Date.now() / 5000);
		const rotation = mat4.rotateY(mat4.translation(origin), rad);
		vec3.transformMat4(eyePosition, rotation, eyePosition);

		// const viewMatrix = mat4.lookAt(
		//   eyePosition,
		//   origin,
		//   upVector,
		// ) as Float32Array;

		// const invViewMatrix = mat4.inverse(viewMatrix) as Float32Array;

		this.invViewMatrix = mat4.translation(
			vec3.fromValues(Math.abs(Math.sin(rad * 2) * 0.2), 0, 0)
		) as Float32Array;
	}

	queueWrite(): void {
		this.device.queue.writeBuffer(
			this.gpuBuffer,
			0,
			this.invViewMatrix.buffer,
			this.invViewMatrix.byteOffset,
			this.invViewMatrix.byteLength
		);
	}
}

export default CameraSettings;
