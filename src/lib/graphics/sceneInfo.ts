import { type Parsed, BufferWriter, MaxValue } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import { object, arrayOf, u32, vec3f, vec4f } from './std140';

const MaxMarchDomains = 64;
const MaxSpheres = 64;

export enum MarchDomainKind {
	AABB = 0,
	PLANE = 1
}

export type MarchDomainStruct = Parsed<typeof MarchDomainStruct>;
export const MarchDomainStruct = object({
	kind: u32,
	pos: vec3f,
	extra: vec3f
});
const MarchDomainStructSize = MarchDomainStruct.measure(MaxValue).size;

type SphereStruct = Parsed<typeof SphereStruct>;
const SphereStruct = object({
	xyzr: vec4f,
	materialIdx: u32
});
const SphereStructSize = SphereStruct.measure(MaxValue).size;

type SceneInfoStruct = Parsed<typeof SceneInfoStruct>;
const SceneInfoStruct = object({
	numOfSpheres: u32,
	numOfDomains: u32
});
const SceneInfoStructSize = SceneInfoStruct.measure(MaxValue).size;

type DomainsTuple = Parsed<typeof DomainsTuple>;
const DomainsTuple = arrayOf(MarchDomainStruct, MaxMarchDomains);
const DomainsTupleSize = DomainsTuple.measure(MaxValue).size;
const DomainsTupleStride = roundUp(MarchDomainStructSize, 16);

type SpheresTuple = Parsed<typeof SpheresTuple>;
const SpheresTuple = arrayOf(SphereStruct, MaxSpheres);
const SpheresTupleSize = SpheresTuple.measure(MaxValue).size;
const SpheresTupleStride = roundUp(SphereStructSize, 16);

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

	gpuSceneInfoBuffer: GPUBuffer;
	gpuDomainsBuffer: GPUBuffer;
	gpuSpheresBuffer: GPUBuffer;

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

		this.gpuSpheresBuffer = device.createBuffer({
			label: 'Scene Spheres Buffer',
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
			size: roundUp(SpheresTupleSize, 16),
			mappedAtCreation: true
		});
		{
			const writer = new BufferWriter(this.gpuSpheresBuffer.getMappedRange());
			SpheresTuple.write(writer, this.hostSpheres);
			this.gpuSpheresBuffer.unmap();
		}
	}

	allocateSphere(sphere: SphereStruct): void {
		const domainIdx = this.hostSceneInfo.numOfDomains;
		const sphereIdx = this.hostSceneInfo.numOfSpheres;
		this.hostSceneInfo.numOfDomains++;
		this.hostSceneInfo.numOfSpheres++;

		const sceneInfoBuffer = new ArrayBuffer(SceneInfoStructSize);
		SceneInfoStruct.write(new BufferWriter(sceneInfoBuffer), this.hostSceneInfo);
		this.device.queue.writeBuffer(
			this.gpuSceneInfoBuffer, // dest
			0, // dest offset
			sceneInfoBuffer, // src
			0, // src offset
			sceneInfoBuffer.byteLength // size
		);

		const domain = domainFromSphere(sphere);

		const domainBuffer = new ArrayBuffer(MarchDomainStructSize);
		MarchDomainStruct.write(new BufferWriter(domainBuffer), domain);
		this.device.queue.writeBuffer(
			this.gpuDomainsBuffer, // dest
			domainIdx * DomainsTupleStride, // dest offset
			domainBuffer, // src
			0, // src offset
			domainBuffer.byteLength // size
		);

		const sphereBuffer = new ArrayBuffer(SphereStructSize);
		SphereStruct.write(new BufferWriter(sphereBuffer), sphere);
		this.device.queue.writeBuffer(
			this.gpuSpheresBuffer, // dest
			sphereIdx * SpheresTupleStride, // dest offset
			sphereBuffer, // src
			0, // src offset
			sphereBuffer.byteLength
		);
	}
}

export default SceneInfo;
