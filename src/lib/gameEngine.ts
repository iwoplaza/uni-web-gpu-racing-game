import { SceneRenderer } from './graphics';
import type { GameEngineCtx } from './gameEngineCtx';
import SceneInfo from './graphics/sceneInfo';

export interface Game {
	init(): void;

	onRender(ctx: GameEngineCtx): void;
}

class GameEngineCtxImpl implements GameEngineCtx {
	lastTime: number;
	deltaTime: number = 0;

	constructor(public readonly sceneInfo: SceneInfo) {
		this.lastTime = Date.now();
	}

	tickRender() {
		const now = Date.now();
		this.deltaTime = now - this.lastTime;
		this.lastTime = now;
	}
}

type GameEngineOptions = {
	device: GPUDevice;
	canvasContext: GPUCanvasContext;
	canvasSize: [number, number];
	presentationFormat: GPUTextureFormat;
};

class GameEngine {
	private readonly device: GPUDevice;
	private readonly renderer: SceneRenderer;

	private ctx: GameEngineCtxImpl;
	private sceneInfo: SceneInfo;

	constructor(
		{ device, canvasContext, canvasSize, presentationFormat }: GameEngineOptions,
		private readonly game: Game
	) {
		this.device = device;

		this.sceneInfo = new SceneInfo(device);
		this.ctx = new GameEngineCtxImpl(this.sceneInfo);
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
		this.game.init();
	}

	static async initFromCanvas(canvas: HTMLCanvasElement, game: Game) {
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

		return new GameEngine(
			{
				device,
				canvasContext: canvasCtx,
				canvasSize: [canvas.width, canvas.height],
				presentationFormat
			},
			game
		);
	}

	dispose() {
		// Dispose of resources here
	}

	renderFrame() {
		this.ctx.tickRender();

		this.game.onRender(this.ctx);

		const commandEncoder = this.device.createCommandEncoder();

		this.renderer.render(commandEncoder);

		this.device.queue.submit([commandEncoder.finish()]);
	}
}

export default GameEngine;
