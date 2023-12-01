import { vec3 } from 'wgpu-matrix';
import type { World } from 'miniplex';

import type { Entity } from './types';

function movementSystem(world: World<Entity>) {
  const movingEntities = world.with('position', 'velocity');

  for (const entity of movingEntities) {
    vec3.add(entity.position, entity.velocity, entity.position);
  }
}

export default movementSystem;
