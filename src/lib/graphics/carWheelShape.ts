import type { Parsed } from 'typed-binary';

import * as std140 from './std140';
import { MarchDomainKind, type MarchDomainAllocator, MarchDomain } from './marchDomain';
import { ShapeCollection, Shape } from './shape';
import { mat4, vec3 } from 'wgpu-matrix';

type CarWheelStruct = Parsed<typeof CarWheelStruct>;
const CarWheelStruct = std140.object({
	transform: std140.mat4f
});

export class CarWheelShapeCollection extends ShapeCollection<CarWheelStruct> {
	constructor(bindGroup: number, device: GPUDevice, domainAllocator: MarchDomainAllocator) {
		super('carwheels', CarWheelStruct, bindGroup, device, domainAllocator);
	}
}

export class CarWheelShape extends Shape<CarWheelStruct> {
	constructor(data: CarWheelStruct) {
		super(data);
	}

	populateDomain(marchDomain: MarchDomain) {
		marchDomain.kind = MarchDomainKind.AABB;
		marchDomain.pos = [...vec3.negate(mat4.getTranslation(this.data.transform)).values()];
		marchDomain.extra = 1; // assuming max radius for now
	}
}
