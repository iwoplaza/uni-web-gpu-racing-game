import type { Parsed } from 'typed-binary';

import * as std140 from './std140';
import { MarchDomainKind, type MarchDomainAllocator, MarchDomain } from './marchDomain';
import { ShapeCollection, Shape } from './shape';

type SphereStruct = Parsed<typeof SphereStruct>;
const SphereStruct = std140.object({
	xyzr: std140.vec4f,
	materialIdx: std140.u32
});

export class SphereShapeCollection extends ShapeCollection<SphereStruct> {
	constructor(device: GPUDevice, domainAllocator: MarchDomainAllocator) {
		super('spheres', SphereStruct, device, domainAllocator);
	}

	structPropertiesCode = `
		xyzr: vec4f,
		material_idx: u32,
	`;
}

export class SphereShape extends Shape<SphereStruct> {
	constructor(sphereData: SphereStruct) {
		super(sphereData);
	}

	populateDomain(marchDomain: MarchDomain) {
		marchDomain.kind = MarchDomainKind.AABB;
		marchDomain.pos = this.data.xyzr;
		marchDomain.extra = this.data.xyzr[3];
	}
}
