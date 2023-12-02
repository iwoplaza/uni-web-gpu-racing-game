import type { With } from 'miniplex';

import type { GameEngineCtx } from './gameEngineCtx';
import type GameObject from './gameObject';
import { CarWheelShape } from './graphics/carWheelShape';
import { CarBodyShape } from './graphics/carBodyShape';
import type { Entity } from './common/systems';
import { mat4, vec3 } from 'wgpu-matrix';

class CarObject implements GameObject {
  
  position: [number, number, number];
  velocity: [number, number, number];
  yawAngle: number;

  // user input
  isAccelerating = false;
  isBreaking = false;
  isTurningRight = false;
  isTurningLeft = false;

  // shapes
  wheels: CarWheelShape[];
  body: CarBodyShape;

  constructor(
    public readonly playerId: string,
    private readonly serverEntity: With<Entity, 'position' | 'velocity'>,
    position: [number, number, number]
  ) {
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.yawAngle = 0;

    this.wheels = [
      new CarWheelShape([-2.2, 0, 3.5]), // front-left
      new CarWheelShape([2.2, 0, 3.5]), // front-right
      new CarWheelShape([-2.2, 0, -3.5]), // back-left
      new CarWheelShape([2.2, 0, -3.5]) // back-right
    ];

    this.body = new CarBodyShape([0, 0, 0]);
  }

  get worldMatrix() {
    const worldMatrix = mat4.identity();
    mat4.translate(worldMatrix, vec3.negate(this.position), worldMatrix);

    return worldMatrix;
  }
  turnRight() {
    const angle = this.wheels[0].turnAngle;
    console.log('turn')
    this.wheels[0].turnAngle = angle + 0.1;
    this.wheels[1].turnAngle = angle + 0.1;
  }
  turnLeft() {
    const angle = this.wheels[0].turnAngle;
    this.wheels[0].turnAngle = angle - 0.1;
    this.wheels[1].turnAngle = angle - 0.1;
  }
  brake() {
      this.position[2] -= 1;
  }
  accelerate() {
      this.position[2] += 1;
  }

  onServerUpdate() {
    this.position = [...this.serverEntity.position];
  }

  fixedUpdate(ctx: GameEngineCtx) {
    // TODO: predicting position, velocity and orientation
    // const newPos = [...this.position];
    // vec3.addScaled(newPos, this.serverEntity.velocity, ctx.deltaTime, newPos);
  }

  // You may also include a method for collision detection or interaction with the track

  render(ctx: GameEngineCtx) {
    const worldMatrix = this.worldMatrix;
    // this.wheels[0].turnAngle = Math.sin(Date.now() * 0.004) * 0.6;
    // this.wheels[1].turnAngle = Math.sin(Date.now() * 0.004) * 0.6 + Math.PI;

    this.wheels[2].turnAngle = 0;
    this.wheels[3].turnAngle = Math.PI;

    // uploading shapes
    for (const wheel of this.wheels) {
      wheel.parentMatrix = worldMatrix;
      ctx.sceneInfo.uploadInstance(wheel);
    }

    this.body.parentMatrix = worldMatrix;
    ctx.sceneInfo.uploadInstance(this.body);
  }
}

export default CarObject;
