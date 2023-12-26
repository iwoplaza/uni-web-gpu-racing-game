import { SceneRenderer } from './graphics';
import type { GameEngineCtx } from './gameEngineCtx';
import SceneInfo from './graphics/sceneInfo';

export interface Game {
  init(sceneInfo: SceneInfo): void;
  dispose(sceneInfo: SceneInfo): void;

  onTick(ctx: GameEngineCtx): void;
  onRender(ctx: GameEngineCtx): void;
}

class GameEngineCtxImpl implements GameEngineCtx {
  lastTime: number;
  deltaTime: number = 0;
  pt: number = 0;

  constructor(public readonly sceneInfo: SceneInfo) {
    this.lastTime = Date.now();
  }

  tick() {
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

  private renderCtx: GameEngineCtxImpl;
  private tickCtx: GameEngineCtxImpl;
  private sceneInfo: SceneInfo;
  private timeBuildup = 0;

  private stopAnimationLoop?: () => void;

  constructor(private readonly game: Game, private clientTickInterval: number) {
    this.sceneInfo = new SceneInfo();
    this.renderCtx = new GameEngineCtxImpl(this.sceneInfo);
    this.tickCtx = new GameEngineCtxImpl(this.sceneInfo);
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

    this.game.init(this.sceneInfo);

    this.sceneInfo.init(device);
    this.renderer = new SceneRenderer(
      device,
      canvasCtx,
      [canvas.width, canvas.height],
      presentationFormat,
      this.sceneInfo
    );

    this.initState = GameEngineInitState.READY;

    const animationLoop = () => {
      animationFrameHandle = requestAnimationFrame(animationLoop);
      this.renderFrame(device);
    };
    let animationFrameHandle = requestAnimationFrame(animationLoop);
    this.stopAnimationLoop = () => cancelAnimationFrame(animationFrameHandle);
  }

  dispose() {
    this.initState = GameEngineInitState.DISPOSED;
    // Dispose of resources here
    this.stopAnimationLoop?.();
    this.game.dispose(this.sceneInfo);
  }

  renderFrame(device: GPUDevice) {
    this.renderCtx.tick();

    this.timeBuildup += this.renderCtx.deltaTime;

    if (this.timeBuildup >= this.clientTickInterval) {
      this.tickCtx.tick();
      this.game.onTick(this.tickCtx);
      this.timeBuildup = this.timeBuildup % this.clientTickInterval;
    }

    this.renderCtx.pt = this.timeBuildup / this.clientTickInterval;
    this.game.onRender(this.renderCtx);

    const commandEncoder = device.createCommandEncoder();
    this.renderer?.render(commandEncoder);
    device.queue.submit([commandEncoder.finish()]);
  }
}

export default GameEngine;
