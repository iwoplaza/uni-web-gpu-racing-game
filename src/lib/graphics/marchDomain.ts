import { BufferWriter, MaxValue, type Parsed } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import * as std140 from './std140';

export const MaxMarchDomains = 64;

export enum MarchDomainKind {
	AABB = 0,
	PLANE = 1
}

export type MarchDomainStruct = Parsed<typeof MarchDomainStruct>;
export const MarchDomainStruct = std140.object({
	kind: std140.u32,
	pos: std140.vec3f,
	extra: std140.vec3f
});
export const MarchDomainStructSize = MarchDomainStruct.measure(MaxValue).size;

export type DomainsTuple = Parsed<typeof DomainsTuple>;
export const DomainsTuple = std140.arrayOf(MarchDomainStruct, MaxMarchDomains);
export const DomainsTupleSize = DomainsTuple.measure(MaxValue).size;
export const DomainsTupleStride = roundUp(MarchDomainStructSize, 16);

export class MarchDomain {
	private data: MarchDomainStruct = {
		kind: MarchDomainKind.AABB,
		pos: [0, 0, 0],
		extra: [0, 0, 0]
	};

	constructor(
		private readonly device: GPUDevice,
		private readonly gpuDomainsBuffer: GPUBuffer,
		private readonly idx: number
	) {}

	get kind() {
		return this.data.kind;
	}

	set kind(value: MarchDomainKind) {
		this.data.kind = value;
	}

	get pos(): readonly [number, number, number] {
		return this.data.pos as [number, number, number];
	}

	set pos(value: readonly number[]) {
		this.data.pos[0] = value[0];
		this.data.pos[1] = value[1];
		this.data.pos[2] = value[2];
	}

	get extra(): readonly [number, number, number] {
		return this.data.extra as [number, number, number];
	}

	set extra(value: readonly number[] | number) {
		if (typeof value === 'number') {
			this.data.extra[0] = value;
			this.data.extra[1] = value;
			this.data.extra[2] = value;
		} else {
			this.data.extra[0] = value[0];
			this.data.extra[1] = value[1];
			this.data.extra[2] = value[2];
		}
	}

	upload() {
		const domainBuffer = new ArrayBuffer(MarchDomainStructSize);
		MarchDomainStruct.write(new BufferWriter(domainBuffer), this.data);
		this.device.queue.writeBuffer(
			this.gpuDomainsBuffer, // dest
			this.idx * DomainsTupleStride, // dest offset
			domainBuffer, // src
			0, // src offset
			domainBuffer.byteLength // size
		);
	}
}

export interface MarchDomainAllocator {
	allocateDomain(): MarchDomain;
}
