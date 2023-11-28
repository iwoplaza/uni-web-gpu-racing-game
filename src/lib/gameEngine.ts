import { SceneRenderer } from './graphics';
import { CarWheelShape } from './graphics/carWheelShape';
import SceneInfo from './graphics/sceneInfo';

type GameEngineOptions = {
	device: GPUDevice;
	canvasContext: GPUCanvasContext;
	canvasSize: [number, number];
	presentationFormat: GPUTextureFormat;
};

class GameEngine {
	private readonly device: GPUDevice;
	private readonly renderer: SceneRenderer;

	private sceneInfo: SceneInfo;

	constructor({ device, canvasContext, canvasSize, presentationFormat }: GameEngineOptions) {
		this.device = device;

		this.sceneInfo = new SceneInfo(device);
		this.renderer = new SceneRenderer(
			device,
			canvasContext,
			canvasSize,
			presentationFormat,
			this.sceneInfo
		);

		// const centerSphere = new SphereShape({
		// 	xyzr: [1, 0, 1, 2],
		// 	materialIdx: 1
		// });
		// sphereShapes.uploadInstance(centerSphere);

		// const lightSphere = new SphereShape({
		// 	xyzr: [-1, 0, 1, 0.5],
		// 	materialIdx: 2
		// });
		// sphereShapes.uploadInstance(lightSphere);

		const wheel = new CarWheelShape();
		this.sceneInfo.uploadInstance(wheel);

		let prev = Date.now();
		const updateWheel = () => {
			const now = Date.now();
			const dt = now - prev;
			prev = now;

			wheel.turnAngle += dt * 0.002;

			this.sceneInfo.uploadInstance(wheel);

			requestAnimationFrame(updateWheel);
		};

		updateWheel();
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
