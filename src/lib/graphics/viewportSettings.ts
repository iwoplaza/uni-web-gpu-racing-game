import { mat4 } from 'wgpu-matrix';

class ViewportSettings {
	private projMatrix = mat4.identity() as Float32Array;

	constructor(private readonly device: GPUDevice) {}

	updateViewport(size: [number, number]) {
		const aspect = size[0] / size[1];
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
