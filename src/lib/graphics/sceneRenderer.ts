import GBuffer from './gBuffer';
import { PostProcessingStep } from './postProcess/postProcessingStep';
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
    context: GPUCanvasContext,
    canvasSize: [number, number],
    presentationFormat: GPUTextureFormat,
    scene: SceneInfo
  ) {
    this.gBuffer = new GBuffer(device, canvasSize);
    this.sdfRenderer = SDFRenderer(device, this.gBuffer, scene);
    this.viewportSettings = new ViewportSettings(device);
    this.postProcess = PostProcessingStep({
      device,
      context,
      gBuffer: this.gBuffer,
      presentationFormat
    });
  }

  updateViewport(size: [number, number]) {
    this.viewportSettings.updateViewport(size);
    // this.gBuffer.updateSize(size);
  }

  render(commandEncoder: GPUCommandEncoder) {
    this.sdfRenderer.perform(commandEncoder);
    this.postProcess.perform(commandEncoder);
  }
}

export default SceneRenderer;
