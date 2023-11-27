import SceneInfo from './sceneInfo';
import type { ShapeCollection } from './shape';
import { SphereShapeCollection } from './sphereShape';
import { CarWheelShapeCollection } from './carWheelShape';
// import { CarBodyShapeCollection } from './carBodyShape';

export class Scene {
	sceneInfo: SceneInfo;

	shapeCollections: ShapeCollection<unknown>[];
	sphereShapes: SphereShapeCollection;
	carWheelShapes: CarWheelShapeCollection;
	// carBodyShapes: CarBodyShapeCollection;

	constructor(device: GPUDevice) {
		this.sceneInfo = new SceneInfo(device);

		this.sphereShapes = new SphereShapeCollection(device, this.sceneInfo);
		this.carWheelShapes = new CarWheelShapeCollection(device, this.sceneInfo);
		// this.carBodyShapes = new CarBodyShapeCollection(device, this.sceneInfo);

		this.shapeCollections = [this.sphereShapes, this.carWheelShapes];
	}

	get definitionsCode() {
		return this.shapeCollections.map((c) => c.definitionsCode).join('\n');
	}
}
