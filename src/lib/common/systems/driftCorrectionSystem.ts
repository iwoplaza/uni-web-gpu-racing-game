import { mat4, vec3, vec4 } from 'wgpu-matrix';
import type { World } from 'miniplex';

import type { Entity } from './types';
import { ServerTickInterval } from '../constants';

function driftCorrectionSystem(
  world: World<Entity>,
  /** milliseconds */ deltaTime: number
) {
  const movingEntities = world.with(
    'position',
    'positionDrift',
    'yawAngle',
    'yawDrift',
  );

  for (const entity of movingEntities) {
      const factor = deltaTime / ServerTickInterval;

      vec3.addScaled(entity.position, entity.positionDrift, factor);

      entity.yawAngle += entity.yawDrift * factor;
  }
}

export default driftCorrectionSystem;
