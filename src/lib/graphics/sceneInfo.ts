import { mat4 } from 'wgpu-matrix';
import { type Parsed, BufferWriter, MaxValue } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import * as std140 from './std140';
import CameraSettings from './cameraSettings';

type SceneInfoStruct = Parsed<typeof SceneInfoStruct>;
const SceneInfoStruct = std140.object({
  numOfShapes: std140.u32
});
const SceneInfoStructSize = SceneInfoStruct.measure(MaxValue).size;

const MaxInstances = 64;

export enum ShapeKind {
  SPHERE,
  CAR_WHEEL,
  CAR_BODY
}

export const shapeKindDefinitions = Object.entries(ShapeKind)
  .filter(([key]) => Number.isNaN(Number.parseInt(key)))
  .map(([key, value]) => `const SHAPE_${key} = ${value};\n`)
  .join('');

export type ShapeStruct = Parsed<typeof ShapeStruct>;
export const ShapeStruct = std140.object({
  kind: std140.u32,
  materialIdx: std140.u32,
  extra1: std140.u32, // general purpose data
  extra2: std140.u32, // general purpose data
  transform: std140.mat4f
});
const ShapeStructSize = ShapeStruct.measure(MaxValue).size;

type ShapesArray = Parsed<typeof ShapesArray>;
const ShapesArray = std140.arrayOf(ShapeStruct, MaxInstances);
const ShapesArraySize = ShapesArray.measure(MaxValue).size;

export interface Shape {
  readonly data: ShapeStruct;
}

class SceneInfo {
  private _device: GPUDevice | undefined = undefined;

  private hostSceneInfo: SceneInfoStruct = {
    numOfShapes: 0
  };

  private hostShapes: ShapesArray = new Array(MaxInstances).fill(null).map(() => ({
    kind: 0,
    extra1: 0,
    extra2: 0,
    materialIdx: 0,
    transform: [...mat4.identity().values()]
  }));

  private instanceToIdxMap = new Map<Shape, number>();
  private instancesArray: Shape[] = [];

  /**
   * Temporary buffer for storing scene info data before uploading
   * it to the GPU.
   */
  sceneInfoBuffer = new ArrayBuffer(SceneInfoStructSize);

  /**
   * Temporary buffer for storing instance data before uploading
   * it to the GPU.
   */
  instanceBuffer = new ArrayBuffer(ShapeStructSize);

  _gpuSceneInfoBuffer: GPUBuffer | undefined;
  _gpuSceneShapesBuffer: GPUBuffer | undefined;

  public camera = new CameraSettings();

  init(device: GPUDevice) {
    this._device = device;

    this.camera.init(device);

    this._gpuSceneInfoBuffer = device.createBuffer({
      label: 'Scene Info Buffer',
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
      size: roundUp(SceneInfoStructSize, 16),
      mappedAtCreation: true
    });
    {
      const writer = new BufferWriter(this._gpuSceneInfoBuffer.getMappedRange());
      SceneInfoStruct.write(writer, this.hostSceneInfo);
      this._gpuSceneInfoBuffer.unmap();
    }

    this._gpuSceneShapesBuffer = device.createBuffer({
      label: 'Scene Shapes Buffer',
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
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

  private writeSceneInfo() {
    const writer = new BufferWriter(this.sceneInfoBuffer);
    SceneInfoStruct.write(writer, this.hostSceneInfo);

    if (!this._device || !this._gpuSceneInfoBuffer) {
      return;
    }

    this._device.queue.writeBuffer(
      this._gpuSceneInfoBuffer,
      0,
      this.sceneInfoBuffer,
      0,
      this.sceneInfoBuffer.byteLength
    );
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
      if (this.hostSceneInfo.numOfShapes === MaxInstances) {
        throw new Error(`Reached shape allocation limit`);
      }

      // allocating index in memory
      idx = this.hostSceneInfo.numOfShapes;
      this.hostSceneInfo.numOfShapes++;

      // uploading new instance count to the gpu
      this.writeSceneInfo();

      this.instanceToIdxMap.set(instance, idx);
      this.instancesArray.push(instance);
    }

    this.writeDataToIdx(idx, instance.data);
  }

  deleteInstance(instance: Shape) {
    const idx = this.instanceToIdxMap.get(instance);

    if (idx === undefined) {
      // nothing to remove
      return;
    }

    // Moving the last element to the place of the removed element
    const lastInstance = this.instancesArray[this.hostSceneInfo.numOfShapes - 1];
    this.instancesArray[idx] = lastInstance;
    this.instanceToIdxMap.set(lastInstance, idx);
    this.instanceToIdxMap.delete(instance);

    // Decreasing the number of shapes
    this.hostSceneInfo.numOfShapes--;

    // uploading new instance count to the gpu
    this.writeSceneInfo();

    this.writeDataToIdx(idx, lastInstance.data);
  }
}

export default SceneInfo;
