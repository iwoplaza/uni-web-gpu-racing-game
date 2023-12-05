import type { World } from 'miniplex';

import type { Entity } from './types';

const TurnRate = 0.00007;

function steeringSystem(world: World<Entity>, limitToPlayerId: string | undefined) {
  const steerables = world.with('playerId');

  for (const entity of steerables) {
    if (limitToPlayerId && entity.playerId !== limitToPlayerId) {
      continue;
    }

    entity.forwardAcceleration = 0;

    if (entity.isAccelerating) {
      entity.forwardAcceleration += 0.00005;
    }

    if (entity.isBraking) {
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
