import { type Parsed, BufferWriter, MaxValue } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import * as std140 from './std140';
import {
	MaxMarchDomains,
	DomainsTuple,
	MarchDomainKind,
	DomainsTupleSize,
	MarchDomain,
	type MarchDomainAllocator
} from './marchDomain';

type SceneInfoStruct = Parsed<typeof SceneInfoStruct>;
const SceneInfoStruct = std140.object({
	numOfDomains: std140.u32
});
const SceneInfoStructSize = SceneInfoStruct.measure(MaxValue).size;

class SceneInfo implements MarchDomainAllocator {
	hostSceneInfo: SceneInfoStruct = {
		numOfDomains: 0
	};

	// Prefilling the buffer with data.
	hostDomains: DomainsTuple = new Array(MaxMarchDomains).fill(null).map(() => ({
		kind: MarchDomainKind.AABB,
		pos: [0, 0, 0],
		extra: [0, 0, 0]
	}));

	gpuSceneInfoBuffer: GPUBuffer;
	gpuDomainsBuffer: GPUBuffer;

	constructor(private readonly device: GPUDevice) {
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

		this.gpuDomainsBuffer = device.createBuffer({
			label: 'Scene Domains Buffer',
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
			size: roundUp(DomainsTupleSize, 16),
			mappedAtCreation: true
		});
		{
			const writer = new BufferWriter(this.gpuDomainsBuffer.getMappedRange());
			DomainsTuple.write(writer, this.hostDomains);
			this.gpuDomainsBuffer.unmap();
		}
	}

	allocateDomain(): MarchDomain {
		const domainIdx = this.hostSceneInfo.numOfDomains;
		this.hostSceneInfo.numOfDomains++;

		const sceneInfoBuffer = new ArrayBuffer(SceneInfoStructSize);
		SceneInfoStruct.write(new BufferWriter(sceneInfoBuffer), this.hostSceneInfo);
		this.device.queue.writeBuffer(
			this.gpuSceneInfoBuffer, // dest
			0, // dest offset
			sceneInfoBuffer, // src
			0, // src offset
			sceneInfoBuffer.byteLength // size
		);

		return new MarchDomain(this.device, this.gpuDomainsBuffer, domainIdx);
	}
}

export default SceneInfo;
