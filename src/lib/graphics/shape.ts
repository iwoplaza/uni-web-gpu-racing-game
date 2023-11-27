import { BufferWriter, MaxValue } from 'typed-binary';

import type { MarchDomain, MarchDomainAllocator } from './marchDomain';
import * as std140 from './std140';
import { roundUp } from '$lib/mathUtils';

export abstract class ShapeCollection<Data> {
	readonly maxInstances = 64;

	readonly arraySchema: std140.AlignedSchema<Data[]>;
	readonly instanceSize: number;
	readonly collectionSize: number;
	readonly stride: number;

	instances: number = 0;
	instanceToIdxMap = new Map<Shape<Data>, number>();
	instanceToDomainMap = new Map<Shape<Data>, MarchDomain>();

	gpuCountBuffer: GPUBuffer;
	gpuInstancesBuffer: GPUBuffer;

	constructor(
		private readonly key: string,
		private readonly schema: std140.AlignedSchema<Data>,
		private readonly bindGroupIdx: number,
		private readonly device: GPUDevice,
		private readonly domainAllocator: MarchDomainAllocator
	) {
		this.instanceSize = schema.measure(MaxValue).size;

		this.arraySchema = std140.arrayOf(schema, this.maxInstances);
		this.collectionSize = this.arraySchema.measure(MaxValue).size;
		this.stride = roundUp(this.instanceSize, 16);

		this.gpuCountBuffer = device.createBuffer({
			label: `${key} collection - count buffer`,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
			size: 4
		});

		this.gpuInstancesBuffer = device.createBuffer({
			label: `${key} collection - instances buffer`,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
			size: roundUp(this.collectionSize, 16)
		});
	}

	get bindGroupLayout() {
		return [
			{
				binding: this.bindGroupIdx,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage' as const
				}
			},
			{
				binding: this.bindGroupIdx + 1,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage' as const
				}
			}
		];
	}

	get bindGroup() {
		return [
			{
				binding: this.bindGroupIdx,
				resource: {
					buffer: this.gpuCountBuffer
				}
			},
			{
				binding: this.bindGroupIdx + 1,
				resource: {
					buffer: this.gpuInstancesBuffer
				}
			}
		];
	}

	uploadInstance(instance: Shape<Data>) {
		let idx = this.instanceToIdxMap.get(instance);
		if (idx === undefined) {
			// allocating index in memory
			idx = this.instances;
			this.instances++;

			const countBuffer = new Uint32Array([this.instances]);
			this.device.queue.writeBuffer(
				this.gpuCountBuffer,
				0,
				countBuffer.buffer,
				0,
				countBuffer.byteLength
			);

			this.instanceToIdxMap.set(instance, idx);
			this.instanceToDomainMap.set(instance, this.domainAllocator.allocateDomain());
		}

		const domain = this.instanceToDomainMap.get(instance)!;

		const instanceBuffer = new ArrayBuffer(this.instanceSize);
		this.schema.write(new BufferWriter(instanceBuffer), instance.data);

		this.device.queue.writeBuffer(
			this.gpuInstancesBuffer, // dest
			idx * this.stride, // dest offset
			instanceBuffer, // src
			0, // src offset
			instanceBuffer.byteLength
		);

		instance.populateDomain(domain);
		domain?.upload();
	}
}

export abstract class Shape<Data> {
	constructor(public readonly data: Data) {}

	abstract populateDomain(marchDomain: MarchDomain): void;
}

export default Shape;
