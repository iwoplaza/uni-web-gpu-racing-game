import { object, u32, type Parsed, tupleOf, f32, BufferWriter, MaxValue } from 'typed-binary';
import { pad } from './schemaUtils';
import type { MemoryLocation } from './gpuBufferLayout';
import GPUBufferLayout from './gpuBufferLayout';

const MaxMarchDomains = 64;
const MaxSpheres = 64;

export enum MarchDomainKind {
	AABB = 0,
	PLANE = 1
}

export type MarchDomainStruct = Parsed<typeof MarchDomainStruct>;
export const MarchDomainStruct = object({
	kind: u32, // 4 bytes
	pos: tupleOf(f32, 3), // 12 bytes
	// --
	extra: pad(tupleOf(f32, 3), 16) // radius or normal
	// --
});
const MarchDomainStructSize = MarchDomainStruct.sizeOf(MaxValue);

type SphereStruct = Parsed<typeof SphereStruct>;
const SphereStruct = object({
	xyzr: tupleOf(f32, 4), // 16 bytes
	// --
	materialIdx: pad(u32, 16)
	// --
});
const SphereStructSize = SphereStruct.sizeOf(MaxValue);

type SceneInfoStruct = Parsed<typeof SceneInfoStruct>;
const SceneInfoStruct = object({
	numOfSpheres: u32, // 4 bytes
	numOfDomains: pad(u32, 12)
	// --
});

type DomainsTuple = Parsed<typeof DomainsTuple>;
const DomainsTuple = tupleOf(MarchDomainStruct, MaxMarchDomains);
type SpheresTuple = Parsed<typeof SpheresTuple>;
const SpheresTuple = tupleOf(SphereStruct, MaxSpheres);

function domainFromSphere(sphere: SphereStruct): MarchDomainStruct {
	const radius = sphere.xyzr[3];

	return {
		kind: MarchDomainKind.AABB,
		pos: [sphere.xyzr[0], sphere.xyzr[1], sphere.xyzr[2]],
		extra: [radius, radius, radius]
	};
}

class SceneInfo {
	hostSceneInfo: SceneInfoStruct = {
		numOfSpheres: 0,
		numOfDomains: 0
	};

	// Prefilling the buffer with data.
	hostDomains: DomainsTuple = new Array(MaxMarchDomains).fill(null).map(() => ({
		kind: MarchDomainKind.AABB,
		pos: [0, 0, 0],
		extra: [0, 0, 0]
	}));

	// Prefilling the buffer with data.
	hostSpheres: SpheresTuple = new Array(MaxSpheres).fill(null).map(() => ({
		xyzr: [0, 0, 0, 1],
		materialIdx: 0
	}));

	sceneInfoMem: MemoryLocation;
	domainsMem: MemoryLocation;
	spheresMem: MemoryLocation;
	gpuBuffer: GPUBuffer;

	constructor(private readonly device: GPUDevice) {
		const layout = new GPUBufferLayout(device, {
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
			mappedAtCreation: true
		});

		this.sceneInfoMem = layout.allocate(SceneInfoStruct);
		this.domainsMem = layout.allocate(DomainsTuple);
		this.spheresMem = layout.allocate(SpheresTuple);

		layout.finalize(5136);
		this.gpuBuffer = layout.buffer;

		const writer = new BufferWriter(this.gpuBuffer.getMappedRange());
		SceneInfoStruct.write(writer, this.hostSceneInfo);
		DomainsTuple.write(writer, this.hostDomains);
		SpheresTuple.write(writer, this.hostSpheres);
		this.gpuBuffer.unmap();
	}

	allocateSphere(sphere: SphereStruct): void {
		const domainIdx = this.hostSceneInfo.numOfDomains;
		const sphereIdx = this.hostSceneInfo.numOfSpheres;
		this.hostSceneInfo.numOfDomains++;
		this.hostSceneInfo.numOfSpheres++;

		const sceneInfoBuffer = new ArrayBuffer(SceneInfoStruct.sizeOf(this.hostSceneInfo));
		SceneInfoStruct.write(new BufferWriter(sceneInfoBuffer), this.hostSceneInfo);
		this.sceneInfoMem.queueWrite(sceneInfoBuffer, sceneInfoBuffer.byteLength);

		const domain = domainFromSphere(sphere);

		const domainBuffer = new ArrayBuffer(MarchDomainStructSize);
		MarchDomainStruct.write(new BufferWriter(domainBuffer), domain);
		this.domainsMem.queueWrite(domainBuffer, domainBuffer.byteLength, {
			bufferOffset: domainIdx * MarchDomainStructSize
		});

		const sphereBuffer = new ArrayBuffer(SphereStructSize);
		SphereStruct.write(new BufferWriter(sphereBuffer), sphere);
		this.spheresMem.queueWrite(sphereBuffer, sphereBuffer.byteLength, {
			bufferOffset: sphereIdx * SphereStructSize
		});

		console.log(this.sceneInfoMem);
	}
}

export default SceneInfo;
