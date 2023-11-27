import { mat4, vec3 } from 'wgpu-matrix';
import type { Parsed } from 'typed-binary';

import * as std140 from './std140';
import { MarchDomainKind, type MarchDomainAllocator, MarchDomain } from './marchDomain';
import { ShapeCollection, Shape } from './shape';

type CarBodyStruct = Parsed<typeof CarBodyStruct>;
const CarBodyStruct = std140.object({
	transform: std140.mat4f
});

export class CarBodyShapeCollection extends ShapeCollection<CarBodyStruct> {
	constructor(device: GPUDevice, domainAllocator: MarchDomainAllocator) {
		super('carbodies', CarBodyStruct, device, domainAllocator);
	}

	structPropertiesCode = `
		transform: mat4x4<f32>,
	`;
}

export class CarBodyShape extends Shape<CarBodyStruct> {
	constructor(data: CarBodyStruct) {
		super(data);
	}

	populateDomain(marchDomain: MarchDomain) {
		marchDomain.kind = MarchDomainKind.AABB;
		marchDomain.pos = [...vec3.negate(mat4.getTranslation(this.data.transform)).values()];
		marchDomain.extra = 1; // assuming max radius for now
	}
}
