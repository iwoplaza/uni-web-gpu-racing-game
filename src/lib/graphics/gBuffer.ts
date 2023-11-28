type RGBA = { r: number; g: number; b: number; a: number };

type GBufferSlot = {
  texture: GPUTexture;
  view: GPUTextureView;
  clearValue: RGBA;
  format: GPUTextureFormat;
  size: [number, number];
};

function createGBufferSlot(
  device: GPUDevice,
  descriptor: Omit<GPUTextureDescriptor, 'size'> & { size: [number, number] },
  clearValue: RGBA
): GBufferSlot {
  const texture = device.createTexture(descriptor);

  return {
    texture,
    view: texture.createView(),
    clearValue,
    format: descriptor.format,
    size: descriptor.size
  };
}

class GBuffer {
  slots: GBufferSlot[] = [];
  rawRender: GBufferSlot; // a render before any post-processing
  aux: GBufferSlot;

  constructor(device: GPUDevice, private _size: [number, number]) {
    this.slots.push(
      (this.rawRender = createGBufferSlot(
        device,
        {
          size: this.size,
          usage:
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.STORAGE_BINDING,
          // color.rgb, material_type
          format: 'rgba8unorm'
        },
        // clear value
        {
          r: 0, // color.r
          g: 0, // color.g
          b: 0, // color.b
          a: 0 // material_type
        }
      ))
    );

    this.slots.push(
      (this.aux = createGBufferSlot(
        device,
        {
          size: _size,
          usage:
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.STORAGE_BINDING,
          // normal.xyz, padding
          format: 'rgba16float'
        },
        // clear value
        {
          r: 0, // normal.x
          g: 0, // normal.y
          b: 0, // normal.z
          a: 0 // padding
        }
      ))
    );
  }

  get size() {
    return this._size;
  }

  updateSize(size: [number, number]) {
    // TODO: Recreate textures.
    this._size = size;
  }
}

export default GBuffer;
