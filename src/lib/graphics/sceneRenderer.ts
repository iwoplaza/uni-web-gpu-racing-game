import GBuffer from './gBuffer';
import { PostProcessingStep } from './postProcess/postProcessingStep';
import type RendererContext from './rendererCtx';
import type SceneInfo from './sceneInfo';
import { SDFRenderer } from './sdfRenderer';
import ViewportSettings from './viewportSettings';
import { WGSLRuntime } from './wgsl';

class SceneRenderer {
  private gBuffer: GBuffer;
  private viewportSettings: ViewportSettings;
  public sdfRenderer: ReturnType<typeof SDFRenderer>;
  private postProcess: ReturnType<typeof PostProcessingStep>;

  public runtime: WGSLRuntime;

  constructor(
    device: GPUDevice,
    canvasSize: [number, number],
    presentationFormat: GPUTextureFormat,
    scene: SceneInfo
  ) {
    this.runtime = new WGSLRuntime(device);

    this.gBuffer = new GBuffer(device, canvasSize);
    this.sdfRenderer = SDFRenderer(this.runtime, this.gBuffer, scene);
    this.viewportSettings = new ViewportSettings(device);
    this.postProcess = PostProcessingStep({
      device,
      gBuffer: this.gBuffer,
      presentationFormat
    });
  }

  render(ctx: RendererContext) {
    this.gBuffer.prepare(ctx);
    this.viewportSettings.prepare(ctx);
    this.sdfRenderer.perform(ctx);
    this.postProcess.perform(ctx);
  }
}

export default SceneRenderer;
