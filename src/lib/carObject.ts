import type { GameEngineCtx } from './gameEngineCtx';
import type GameObject from './gameObject';
import { CarWheelShape } from './graphics/carWheelShape';

class CarObject implements GameObject {
  wheels: CarWheelShape[];

  constructor() {
    this.wheels = [
      new CarWheelShape([-2.2, 0, 3.5]), // front-left
      new CarWheelShape([2.2, 0, 3.5]), // front-right
      new CarWheelShape([-2.2, 0, -3.5]), // back-left
      new CarWheelShape([2.2, 0, -3.5]) // back-right
    ];
  }

  render(ctx: GameEngineCtx) {
    this.wheels[0].turnAngle = Math.sin(Date.now() * 0.004) * 0.6;
    this.wheels[1].turnAngle = Math.sin(Date.now() * 0.004) * 0.6 + Math.PI;

    this.wheels[3].turnAngle = Math.PI;

    // uploading shapes
    for (const wheel of this.wheels) {
      ctx.sceneInfo.uploadInstance(wheel);
    }
  }
}

export default CarObject;
