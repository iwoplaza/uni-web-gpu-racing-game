import _ from 'lodash';
import { mat4, utils, vec3 } from 'wgpu-matrix';

import type { GameEngineCtx } from '../gameEngineCtx';
import type { Entity, PlayerEntity } from '../common/systems';
import type SceneInfo from '../graphics/sceneInfo';
import type GameObject from '../gameObject';
import { CarWheelShape } from './carWheelShape';
import { CarBodyShape } from './carBodyShape';

const WHEEL_TURN_VELOCITY_TO_ANGLE = 10.0;

class CarObject implements GameObject {
  prevPosition: [number, number, number] = [0, 0, 0];
  position: [number, number, number] = [0, 0, 0];

  prevYawAngle: number = 0;
  yawAngle: number = 0;

  prevTurnVelocity: number = 0;
  turnVelocity: number = 0;

  // shapes
  wheels: CarWheelShape[];
  body: CarBodyShape;

  constructor(public readonly playerId: string, public readonly entity: PlayerEntity) {
    vec3.copy(entity.position, this.prevPosition);
    vec3.copy(entity.position, this.position);

    this.prevYawAngle = entity.yawAngle;
    this.yawAngle = entity.yawAngle;

    this.prevTurnVelocity = entity.turnVelocity;
    this.turnVelocity = entity.turnVelocity;

    this.wheels = [
      new CarWheelShape([-2.2, 1, 3.5]), // front-left
      new CarWheelShape([2.2, 1, 3.5]), // front-right
      new CarWheelShape([-2.2, 1, -3.5]), // back-left
      new CarWheelShape([2.2, 1, -3.5]) // back-right
    ];

    this.body = new CarBodyShape([0, 1, 0]);
  }

  dispose(sceneInfo: SceneInfo) {
    for (const wheel of this.wheels) {
      sceneInfo.deleteInstance(wheel);
    }
    sceneInfo.deleteInstance(this.body);
  }

  worldMatrix(pt: number) {
    const tPos = vec3.lerp(this.prevPosition, this.position, pt);
    const tYaw = utils.lerp(this.prevYawAngle, this.yawAngle, pt);

    const worldMatrix = mat4.identity();
    mat4.rotateY(worldMatrix, -tYaw, worldMatrix);
    mat4.translate(worldMatrix, vec3.negate(tPos), worldMatrix);

    return worldMatrix;
  }

  /**
   * @returns true if the same within the given keys
   */
  compareStateWith(other: Partial<Record<keyof Entity, unknown>>, keys: (keyof Entity)[]) {
    const delta = _.pickBy(
      this.entity,
      (v, k) => keys.includes(k as keyof Entity) && v != other[k as keyof Entity]
    );

    return Object.keys(delta).length === 0;
  }

  onTick(): void {
    // Sending inputs every tick
    vec3.copy(this.position, this.prevPosition);
    vec3.copy(this.entity.position, this.position);

    this.prevYawAngle = this.yawAngle;
    this.yawAngle = this.entity.yawAngle;

    this.prevTurnVelocity = this.turnVelocity;
    this.turnVelocity = this.entity.turnVelocity;
  }

  render(ctx: GameEngineCtx) {
    const worldMatrix = this.worldMatrix(ctx.pt);
    const tTurnVelocity = utils.lerp(this.prevTurnVelocity, this.turnVelocity, ctx.pt);

    this.wheels[0].turnAngle = tTurnVelocity * WHEEL_TURN_VELOCITY_TO_ANGLE;
    this.wheels[1].turnAngle = tTurnVelocity * WHEEL_TURN_VELOCITY_TO_ANGLE + Math.PI;

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
