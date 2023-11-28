import { mat4 } from 'wgpu-matrix';

import { ShapeKind, type Shape, type ShapeStruct } from './sceneInfo';

export class CarWheelShape implements Shape {
	turnAngle: number = 0;

	get data(): ShapeStruct {
		const transform = mat4.identity();
		mat4.rotateY(transform, this.turnAngle, transform);

		return {
			kind: ShapeKind.CAR_WHEEL,
			materialIdx: 0,
			extra1: 0,
			extra2: 0,
			transform: [...transform.values()]
		};
	}
}
