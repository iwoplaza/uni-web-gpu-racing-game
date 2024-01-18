import { SceneRenderer } from './graphics';
import SceneInfo from './graphics/sceneInfo';
import type { GameEngineCtx } from './gameEngineCtx';
import { WGSLRuntime } from './graphics/wgsl';
import type RendererContext from './graphics/rendererCtx';

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

  runtime!: WGSLRuntime;

  constructor(public readonly sceneInfo: SceneInfo) {
    this.lastTime = Date.now();
  }

  tick() {
    const now = Date.now();
    this.deltaTime = now - this.lastTime;
    this.lastTime = now;
  }
}

class RendererContextImpl implements RendererContext {
  public commandEncoder!: GPUCommandEncoder;
  public targetResolution: [number, number] = [0, 0];

  constructor(
    public runtime: WGSLRuntime,
    private _canvas: HTMLCanvasElement,
    private _canvasCtx: GPUCanvasContext
  ) {
    this.targetResolution[0] = this._canvas.clientWidth * devicePixelRatio;
    this.targetResolution[1] = this._canvas.clientHeight * devicePixelRatio;
    this._canvas.width = this.targetResolution[0];
    this._canvas.height = this.targetResolution[1];
  }

  renderPrep() {
    this.targetResolution[0] = this._canvas.clientWidth * devicePixelRatio;
    this.targetResolution[1] = this._canvas.clientHeight * devicePixelRatio;
    this._canvas.width = this.targetResolution[0];
    this._canvas.height = this.targetResolution[1];

    this.commandEncoder = this.runtime.device.createCommandEncoder();
  }

  get renderTargetView(): GPUTextureView {
    return this._canvasCtx.getCurrentTexture().createView();
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
  private rendererCtx!: RendererContextImpl;
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
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    // Configuring canvas
    const canvasCtx = canvas.getContext('webgpu') as GPUCanvasContext;
    canvasCtx.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied'
    });

    const runtime = new WGSLRuntime(device);

    this.rendererCtx = new RendererContextImpl(runtime, canvas, canvasCtx);

    this.game.init(this.sceneInfo);

    this.sceneInfo.init(device);
    this.renderer = new SceneRenderer(
      runtime,
      [...this.rendererCtx.targetResolution],
      presentationFormat,
      this.sceneInfo
    );
    this.renderCtx.runtime = runtime;
    this.tickCtx.runtime = runtime;

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
    this.rendererCtx.renderPrep();

    this.renderCtx.tick();

    this.timeBuildup += this.renderCtx.deltaTime;

    if (this.timeBuildup >= this.clientTickInterval) {
      this.tickCtx.tick();
      this.game.onTick(this.tickCtx);
      this.timeBuildup = this.timeBuildup % this.clientTickInterval;
    }

    this.renderCtx.pt = this.timeBuildup / this.clientTickInterval;
    this.game.onRender(this.renderCtx);

    this.renderer?.render(this.rendererCtx);
    device.queue.submit([this.rendererCtx.commandEncoder.finish()]);
  }
}

export default GameEngine;
