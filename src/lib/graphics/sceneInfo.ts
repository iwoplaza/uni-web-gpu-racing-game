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

const ShapesArray = std140.arrayOf(ShapeStruct, MaxInstances);
const ShapesArraySize = ShapesArray.measure(MaxValue).size;

export interface Shape {
  readonly data: ShapeStruct;
}

class SceneInfo {
  private hostSceneInfo: SceneInfoStruct = {
    numOfShapes: 0
  };

  private instanceToIdxMap = new Map<Shape, number>();

  gpuSceneInfoBuffer: GPUBuffer;
  gpuSceneShapesBuffer: GPUBuffer;

  public camera: CameraSettings;

  constructor(private readonly device: GPUDevice) {
    this.camera = new CameraSettings(device);

    this.gpuSceneInfoBuffer = device.createBuffer({
      label: 'Scene Info Buffer',
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
      size: roundUp(SceneInfoStructSize, 16),
      mappedAtCreation: true
    });
    {
      const writer = new BufferWriter(this.gpuSceneInfoBuffer.getMappedRange());
      SceneInfoStruct.write(writer, this.hostSceneInfo);
      this.gpuSceneInfoBuffer.unmap();
    }

    this.gpuSceneShapesBuffer = device.createBuffer({
      label: 'Scene Shapes Buffer',
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
      size: roundUp(ShapesArraySize, 16)
    });
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
      const sceneInfoBuffer = new ArrayBuffer(SceneInfoStructSize);
      const writer = new BufferWriter(sceneInfoBuffer);
      SceneInfoStruct.write(writer, this.hostSceneInfo);
      this.device.queue.writeBuffer(
        this.gpuSceneInfoBuffer,
        0,
        sceneInfoBuffer,
        0,
        sceneInfoBuffer.byteLength
      );

      this.instanceToIdxMap.set(instance, idx);
    }

    const instanceBuffer = new ArrayBuffer(ShapeStructSize);
    ShapeStruct.write(new BufferWriter(instanceBuffer), instance.data);

    this.device.queue.writeBuffer(
      this.gpuSceneShapesBuffer, // dest
      idx * ShapeStructSize, // dest offset
      instanceBuffer, // src
      0, // src offset
      instanceBuffer.byteLength
    );
  }
}

export default SceneInfo;
