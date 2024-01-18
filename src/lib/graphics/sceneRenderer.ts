import GBuffer from './gBuffer';
import { PostProcessingStep } from './postProcess/postProcessingStep';
import type RendererContext from './rendererCtx';
import type SceneInfo from './sceneInfo';
import { SDFRenderer } from './sdfRenderer';
import ViewportSettings from './viewportSettings';
import type { WGSLRuntime } from './wgsl';

class SceneRenderer {
  private gBuffer: GBuffer;
  private viewportSettings: ViewportSettings;
  public sdfRenderer: ReturnType<typeof SDFRenderer>;
  private postProcess: ReturnType<typeof PostProcessingStep>;

  constructor(
    runtime: WGSLRuntime,
    canvasSize: [number, number],
    presentationFormat: GPUTextureFormat,
    private sceneInfo: SceneInfo
  ) {
    const sceneInfoWGSL = sceneInfo.wgslDefinitions;

    this.gBuffer = new GBuffer(runtime.device, canvasSize);
    this.sdfRenderer = SDFRenderer(runtime, this.gBuffer, sceneInfoWGSL);
    this.viewportSettings = new ViewportSettings(runtime.device);
    this.postProcess = PostProcessingStep({
      device: runtime.device,
      gBuffer: this.gBuffer,
      presentationFormat
    });
  }

  render(ctx: RendererContext) {
    this.sceneInfo.camera.prepare(ctx);

    this.gBuffer.prepare(ctx);
    this.viewportSettings.prepare(ctx);
    this.sdfRenderer.perform(ctx);
    this.postProcess.perform(ctx);
  }
}

export default SceneRenderer;
