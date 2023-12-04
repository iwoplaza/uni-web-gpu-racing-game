import type { World } from 'miniplex';

import type { Entity } from './types';

const TurnRate = 0.00007;

function steeringSystem(world: World<Entity>) {
  const steerables = world.with(
    'isAccelerating',
    'isBreaking',
    'isTurningLeft',
    'isTurningRight',
    'forwardAcceleration',
    'turnAcceleration'
  );

  for (const entity of steerables) {
    entity.forwardAcceleration = 0;

    if (entity.isAccelerating) {
      entity.forwardAcceleration += 0.00005;
    }

    if (entity.isBreaking) {
      entity.forwardAcceleration += -0.00005;
    }

    entity.turnAcceleration = 0;

    if (entity.isTurningLeft) {
      entity.turnAcceleration -= TurnRate;
    }

    if (entity.isTurningRight) {
      entity.turnAcceleration += TurnRate;
    }
  }
}

export default steeringSystem;
