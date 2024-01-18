import GBuffer from './gBuffer';
import { PostProcessingStep } from './postProcess/postProcessingStep';
import type RendererContext from './rendererCtx';
import type SceneInfo from './sceneInfo';
import { SDFRenderer } from './sdfRenderer';
import ViewportSettings from './viewportSettings';

class SceneRenderer {
  private gBuffer: GBuffer;
  private viewportSettings: ViewportSettings;
  public sdfRenderer: ReturnType<typeof SDFRenderer>;
  private postProcess: ReturnType<typeof PostProcessingStep>;

  constructor(
    device: GPUDevice,
    canvasSize: [number, number],
    presentationFormat: GPUTextureFormat,
    scene: SceneInfo
  ) {
    this.gBuffer = new GBuffer(device, canvasSize);
    this.sdfRenderer = SDFRenderer(device, this.gBuffer, scene);
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
