import { mat4, utils, vec3, vec4 } from 'wgpu-matrix';
import type { World } from 'miniplex';

import type { Entity } from './types';

const zPosVec = vec4.fromValues(0, 0, 1, 0);

function dampValue(value: number, dampAmount: number, deltaTime: number) {
  if (value > 0) {
    return Math.max(0, value - dampAmount * deltaTime);
  }
  if (value < 0) {
    return Math.min(0, value + dampAmount * deltaTime);
  }
  return value;
}

function clamp(value: number, a: number, b: number) {
  return Math.max(a, Math.min(value, b));
}

const MaxTurnVelocityRange = [0.03, 0.1];

function movementSystem(
  world: World<Entity>,
  limitToPlayerId: string | undefined,
  /** milliseconds */ deltaTime: number
) {
  const movingEntities = world.with(
    'position',
    'forwardVelocity',
    'forwardAcceleration',
    'maxForwardVelocity',
    'maxBackwardVelocity',

    'yawAngle',
    'turnVelocity',
    'turnAcceleration'
  );

  for (const entity of movingEntities) {
    entity.forwardVelocity += entity.forwardAcceleration * deltaTime;

    entity.forwardVelocity = clamp(
      entity.forwardVelocity,
      -entity.maxBackwardVelocity,
      entity.maxForwardVelocity
    );

    if (Math.abs(entity.forwardAcceleration) < 0.000001) {
      entity.forwardVelocity = dampValue(entity.forwardVelocity, 0.00001, deltaTime);
    }

    const speedFactor = Math.abs(entity.forwardVelocity) / entity.maxForwardVelocity;

    const turnAccFactor = utils.lerp(3, 1, speedFactor);
    entity.turnVelocity += entity.turnAcceleration * turnAccFactor * deltaTime;
    const maxTurnVelocity = utils.lerp(
      MaxTurnVelocityRange[1],
      MaxTurnVelocityRange[0],
      speedFactor
    );
    entity.turnVelocity = clamp(entity.turnVelocity, -maxTurnVelocity, maxTurnVelocity);

    entity.yawAngle += entity.turnVelocity * entity.forwardVelocity * deltaTime;
    if (Math.abs(entity.turnAcceleration) < 0.000001) {
      entity.turnVelocity = dampValue(entity.turnVelocity, 0.0001, deltaTime);
    }

    const forward = vec4.transformMat4(zPosVec, mat4.rotationY(entity.yawAngle));
    const velocity = vec3.scale(forward, entity.forwardVelocity);
    vec3.addScaled(entity.position, velocity, deltaTime, entity.position);
  }
}

export default movementSystem;
