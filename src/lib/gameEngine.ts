import { SceneRenderer } from './graphics';
import type { GameEngineCtx } from './gameEngineCtx';
import SceneInfo from './graphics/sceneInfo';

export interface Game {
  init(sceneInfo: SceneInfo): void;
  dispose(sceneInfo: SceneInfo): void;

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

export enum GameEngineInitState {
  NOT_INITIALIZED,
  STARTING,
  READY,
  DISPOSED
}

class GameEngine {
  private initState: GameEngineInitState = GameEngineInitState.NOT_INITIALIZED;
  private renderer: SceneRenderer | undefined = undefined;

  private ctx: GameEngineCtxImpl;
  private sceneInfo: SceneInfo;

  private stopAnimationLoop?: () => void;

  constructor(private readonly game: Game) {
    this.sceneInfo = new SceneInfo();
    this.ctx = new GameEngineCtxImpl(this.sceneInfo);
  }

  async start(canvas: HTMLCanvasElement) {
    if (this.initState !== GameEngineInitState.NOT_INITIALIZED) {
      // Already processing
      return;
    }

    this.initState = GameEngineInitState.STARTING;

    // Initializing WebGPU
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      this.initState = GameEngineInitState.NOT_INITIALIZED;
      throw new Error(`Null GPU adapter`);
    }

    const device = await adapter.requestDevice();

    if ((this.initState as GameEngineInitState) === GameEngineInitState.DISPOSED) {
      // Already disposed
      return;
    }

    // Computing canvas properties
    canvas.width = 512;
    canvas.height = 512;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    // Configuring canvas
    const canvasCtx = canvas.getContext('webgpu') as GPUCanvasContext;
    canvasCtx.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied'
    });

    this.sceneInfo.init(device);

    this.renderer = new SceneRenderer(
      device,
      canvasCtx,
      [canvas.width, canvas.height],
      presentationFormat,
      this.sceneInfo
    );

    const animationLoop = () => {
      animationFrameHandle = requestAnimationFrame(animationLoop);
      this.renderFrame(device);
    };
    let animationFrameHandle = requestAnimationFrame(animationLoop);
    this.stopAnimationLoop = () => cancelAnimationFrame(animationFrameHandle);

    this.initState = GameEngineInitState.READY;

    this.game.init(this.sceneInfo);
  }

  dispose() {
    this.initState = GameEngineInitState.DISPOSED;
    // Dispose of resources here
    this.stopAnimationLoop?.();
    this.game.dispose(this.sceneInfo);
  }

  renderFrame(device: GPUDevice) {
    this.ctx.tickRender();

    this.game.onRender(this.ctx);

    const commandEncoder = device.createCommandEncoder();
    this.renderer?.render(commandEncoder);
    device.queue.submit([commandEncoder.finish()]);
  }
}

export default GameEngine;
