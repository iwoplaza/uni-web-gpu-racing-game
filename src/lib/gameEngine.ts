import { SceneRenderer } from './graphics';

type GameEngineOptions = {
	device: GPUDevice;
	canvasContext: GPUCanvasContext;
	canvasSize: [number, number];
	presentationFormat: GPUTextureFormat;
};

class GameEngine {
	private readonly device: GPUDevice;
	private readonly renderer: SceneRenderer;

	constructor({ device, canvasContext, canvasSize, presentationFormat }: GameEngineOptions) {
		this.device = device;
		this.renderer = new SceneRenderer(device, canvasContext, canvasSize, presentationFormat);
	}

	static async initFromCanvas(canvas: HTMLCanvasElement) {
		// Initializing WebGPU
		const adapter = await navigator.gpu.requestAdapter();

		if (!adapter) {
			throw new Error(`Null GPU adapter`);
		}

		const device = await adapter.requestDevice();

		// Computing canvas properties
		const devicePixelRatio = window.devicePixelRatio || 1;
		canvas.width = canvas.clientWidth * devicePixelRatio;
		canvas.height = canvas.clientHeight * devicePixelRatio;
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

		// Configuring canvas
		const canvasCtx = canvas.getContext('webgpu') as GPUCanvasContext;
		canvasCtx.configure({
			device,
			format: presentationFormat,
			alphaMode: 'premultiplied'
		});

		return new GameEngine({
			device,
			canvasContext: canvasCtx,
			canvasSize: [canvas.width, canvas.height],
			presentationFormat
		});
	}

	dispose() {
		// Dispose of resources here
	}

	renderFrame() {
		const commandEncoder = this.device.createCommandEncoder();

		this.renderer.render(commandEncoder);

		this.device.queue.submit([commandEncoder.finish()]);
	}
}

export default GameEngine;
