import type RendererContext from './rendererCtx';
import { diffResolution } from './rendererCtx';

type RGBA = { r: number; g: number; b: number; a: number };

type SpecificDescriptor = Omit<GPUTextureDescriptor, 'size'> & { size: [number, number] };

type GBufferSlot = {
  texture: GPUTexture;
  view: GPUTextureView;
  descriptor: SpecificDescriptor;
  clearValue: RGBA;
};

function createGBufferSlot(
  device: GPUDevice,
  descriptor: SpecificDescriptor,
  clearValue: RGBA
): GBufferSlot {
  const texture = device.createTexture(descriptor);

  return {
    texture,
    view: texture.createView(),
    descriptor,
    clearValue
  };
}

class GBuffer {
  private prevResolution: [number, number];
  slots: GBufferSlot[] = [];
  rawRender: GBufferSlot; // a render before any post-processing

  constructor(device: GPUDevice, resolution: [number, number]) {
    this.prevResolution = resolution;

    this.slots.push(
      (this.rawRender = createGBufferSlot(
        device,
        {
          // size: [this.size[0] / 2, this.size[1] / 2],
          size: resolution,
          usage:
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.STORAGE_BINDING,
          // color.rgba
          format: 'rgba8unorm'
        },
        // clear value
        {
          r: 0, // color.r
          g: 0, // color.g
          b: 0, // color.b
          a: 0 // color.a
        }
      ))
    );
  }

  prepare(ctx: RendererContext) {
    if (!diffResolution(this.prevResolution, ctx.targetResolution)) {
      return;
    }

    this.prevResolution = [...ctx.targetResolution];

    this.rawRender.descriptor.size = [...ctx.targetResolution];

    for (const slot of this.slots) {
      slot.texture.destroy();
      slot.texture = ctx.device.createTexture(slot.descriptor);
      slot.view = slot.texture.createView();
    }
  }
}

export default GBuffer;
