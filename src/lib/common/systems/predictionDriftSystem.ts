import { vec3 } from 'wgpu-matrix';
import type { World } from 'miniplex';

import { ServerTickInterval } from '../constants';
import type { Entity } from './types';

function predictionDriftSystem(world: World<Entity>, /** milliseconds */ deltaTime: number) {
  const entities = world.with('position', 'positionDrift', 'yawAngle', 'yawDrift');

  for (const entity of entities) {
    vec3.addScaled(
      entity.position,
      entity.positionDrift,
      deltaTime / ServerTickInterval,
      entity.position
    );

    entity.yawAngle += (entity.yawDrift * deltaTime) / ServerTickInterval;
  }
}

export default predictionDriftSystem;
