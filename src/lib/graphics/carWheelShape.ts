import { mat4, vec3 } from 'wgpu-matrix';

import { ShapeKind, type Shape, type ShapeStruct } from './sceneInfo';

export class CarWheelShape implements Shape {
	position = [0, 0, 0];
	turnAngle: number = 0;

	constructor(pos: [number, number, number]) {
		this.position = pos;
	}

	get data(): Readonly<ShapeStruct> {
		const transform = mat4.identity();
		mat4.rotateY(transform, -this.turnAngle, transform);
		mat4.scale(transform, vec3.fromValues(1, 1, 1), transform);
		mat4.translate(transform, vec3.negate(this.position), transform);

		return {
			kind: ShapeKind.CAR_WHEEL,
			materialIdx: 0,
			extra1: 0,
			extra2: 0,
			transform: [...transform.values()]
		};
	}
}
