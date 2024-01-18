export function diffResolution(resA: [number, number], resB: [number, number]) {
  return resA[0] !== resB[0] || resA[1] !== resB[1];
}

interface RendererContext {
  readonly device: GPUDevice;
  readonly commandEncoder: GPUCommandEncoder;
  readonly renderTargetView: GPUTextureView;
  readonly targetResolution: [number, number];
}

export default RendererContext;
