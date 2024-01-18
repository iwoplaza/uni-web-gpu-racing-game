import { mat4 } from 'wgpu-matrix';
import { type Parsed, BufferWriter, MaxValue } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import * as std140 from './std140';
import CameraSettings from './cameraSettings';
import type { ShapeKind } from './types';
import wgsl, { WGSLToken, type WGSLSegment, WGSLMemoryBlock, WGSLRuntime } from './wgsl';

const MaxInstances = 64;

export type ShapeStruct = Parsed<typeof ShapeStruct>;
export const ShapeStruct = std140.object({
  kind: std140.u32,
  flags: std140.u32,
  extra1: std140.u32, // general purpose data
  extra2: std140.u32, // general purpose data
  transform: std140.mat4f
});
const ShapeStructSize = ShapeStruct.measure(MaxValue).size;

export type ShapeData = Omit<ShapeStruct, 'kind'>;

type ShapesArray = Parsed<typeof ShapesArray>;
const ShapesArray = std140.arrayOf(ShapeStruct, MaxInstances);
const ShapesArraySize = ShapesArray.measure(MaxValue).size;

export interface Shape {
  readonly kind: ShapeKind;
  readonly data: Readonly<ShapeData>;
}

export type SceneInfoWGSL = {
  readonly shapeDefinitionsCode: WGSLSegment;

  readonly sceneResolverCode: WGSLSegment;
  readonly materialResolverCode: WGSLSegment;
};

export const SceneInfoWGSLPlaceholders = {
  shapeDefinitions: wgsl.placeholder('Scene Shape Definitions'),
  sceneResolver: wgsl.placeholder('Scene Resolver'),
  materialResolver: wgsl.placeholder('Material Resolver')
};

const SCENE_INFO_BLOCK = new WGSLMemoryBlock(
  'scene_info_block',
  GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  'uniform'
);
export const $numberOfShapes = SCENE_INFO_BLOCK.allocate('numOfShapes', 'u32', std140.u32);

class SceneInfo {
  private _device: GPUDevice | undefined = undefined;

  private shapeDefinitions: { kind: ShapeKind; token: WGSLToken; id: number }[] = [];
  private kindToIdMap = new Map<ShapeKind, number>();

  private numberOfShapes = 0;

  private hostShapes: ShapesArray = new Array(MaxInstances).fill(null).map(() => ({
    kind: 0,
    flags: 0,
    extra1: 0,
    extra2: 0,
    transform: [...mat4.identity().values()]
  }));

  private instanceToIdxMap = new Map<Shape, number>();
  private instancesArray: Shape[] = [];

  /**
   * Temporary buffer for storing instance data before uploading
   * it to the GPU.
   */
  instanceBuffer = new ArrayBuffer(ShapeStructSize);

  _gpuSceneInfoBuffer: GPUBuffer | undefined;
  _gpuSceneShapesBuffer: GPUBuffer | undefined;

  public camera = new CameraSettings();

  registerShapeKind(kind: ShapeKind) {
    const def = { kind, token: new WGSLToken('shape'), id: this.shapeDefinitions.length };

    this.shapeDefinitions.push(def);
    this.kindToIdMap.set(kind, def.id);
  }

  init(device: GPUDevice) {
    this._device = device;

    this._gpuSceneShapesBuffer = device.createBuffer({
      label: 'Scene Shapes Buffer',
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
      size: roundUp(ShapesArraySize, 16),
      mappedAtCreation: true
    });
    // Uploading the instances that are already there
    {
      const writer = new BufferWriter(this._gpuSceneShapesBuffer.getMappedRange());
      ShapesArray.write(writer, this.hostShapes);
      this._gpuSceneShapesBuffer.unmap();
    }
  }

  get gpuSceneInfoBuffer() {
    if (!this._gpuSceneInfoBuffer) {
      throw new Error(`SceneInfo has to be initialized`);
    }

    return this._gpuSceneInfoBuffer;
  }

  get gpuSceneShapesBuffer() {
    if (!this._gpuSceneShapesBuffer) {
      throw new Error(`SceneInfo has to be initialized`);
    }

    return this._gpuSceneShapesBuffer;
  }

  private writeSceneInfo(runtime: WGSLRuntime) {
    $numberOfShapes.write(runtime, this.numberOfShapes);
  }

  private writeDataToIdx(idx: number, data: ShapeStruct) {
    ShapeStruct.write(new BufferWriter(this.instanceBuffer), data);

    this.hostShapes[idx] = data;

    if (!this._device || !this._gpuSceneShapesBuffer) {
      return;
    }

    this._device.queue.writeBuffer(
      this._gpuSceneShapesBuffer, // dest
      idx * ShapeStructSize, // dest offset
      this.instanceBuffer, // src
      0, // src offset
      this.instanceBuffer.byteLength
    );
  }

  uploadInstance(instance: Shape) {
    let idx = this.instanceToIdxMap.get(instance);
    if (idx === undefined) {
      if (this.numberOfShapes === MaxInstances) {
        throw new Error(`Reached shape allocation limit`);
      }

      // allocating index in memory
      idx = this.numberOfShapes;
      this.numberOfShapes++;

      // uploading new instance count to the gpu
      this.writeSceneInfo();

      this.instanceToIdxMap.set(instance, idx);
      this.instancesArray.push(instance);
    }

    const id = this.kindToIdMap.get(instance.kind);
    if (id === undefined) {
      throw new Error(`Cannot render shape that has not been registered before.`);
    }

    this.writeDataToIdx(idx, { kind: id, ...instance.data });
  }

  deleteInstance(instance: Shape) {
    const idx = this.instanceToIdxMap.get(instance);

    if (idx === undefined) {
      // nothing to remove
      return;
    }

    // Moving the last element to the place of the removed element
    const lastInstance = this.instancesArray[this.numberOfShapes - 1];
    this.instancesArray[idx] = lastInstance;
    this.instanceToIdxMap.set(lastInstance, idx);
    this.instanceToIdxMap.delete(instance);

    // Decreasing the number of shapes
    this.numberOfShapes--;

    // uploading new instance count to the gpu
    this.writeSceneInfo();

    const id = this.kindToIdMap.get(lastInstance.kind)!;
    this.writeDataToIdx(idx, { kind: id, ...lastInstance.data });
  }

  get wgslDefinitions(): SceneInfoWGSL {
    return {
      shapeDefinitionsCode: wgsl`
        // enum
        ${this.shapeDefinitions.map((def) => wgsl`const ${def.token}_id = ${String(def.id)};\n`)}
        
        // sdf functions
        ${this.shapeDefinitions.map(
          (def) => wgsl`
            fn sdf_${def.token}(in_pos: vec3f, ctx: ShapeContext, shape_idx: u32) -> f32 {
              var pos = in_pos;
              ${def.kind.shapeCode}
            }`
        )}
        
        // material functions
        ${this.shapeDefinitions.map(
          (def) => wgsl`
            fn mat_${def.token}(ctx: MatContext, shape_idx: u32, out: ptr<function, Material>) {
              var pos = ctx.pos;
                ${def.kind.materialCode}
            }`
        )}
      `,
      sceneResolverCode: wgsl`
        ${this.shapeDefinitions.map(
          (def) => wgsl`
            if (kind == ${def.id}) {
              return sdf_${def.token}(pos, ctx, idx);
            }`
        )}`,

      materialResolverCode: wgsl`
        ${this.shapeDefinitions.map(
          (def) => wgsl`
            if (kind == ${def.id}) {
              mat_${def.token}(ctx, u32(shape_idx), out);
            }`
        )}`
    };
  }
}

export default SceneInfo;
