// carCollisionSystem.ts

import type { World } from 'miniplex';
import type { Entity, PlayerEntity } from './types';
import _ from 'lodash';

const CAR_RADIUS = 2; // Default radius for collision, adjust as needed

function checkCollision(entity1: PlayerEntity, entity2: PlayerEntity) {
  // Use entity radius or default radius
  const radius1 = CAR_RADIUS;
  const radius2 = CAR_RADIUS;
  const dx = entity1.position[0] - entity2.position[0];
  const dy = entity1.position[2] - entity2.position[2];

  const distance = Math.sqrt(dx * dx + dy * dy);

  return { collided: distance < radius1 + radius2, distance: distance };
}

function carCollisionSystem(world: World<Entity>) {
  const entities = world.with(
    'position',
    'forwardVelocity',
    'forwardAcceleration',
    'maxForwardVelocity',
    'maxBackwardVelocity',

    'yawAngle',
    'turnVelocity',
    'turnAcceleration'
  ).entities as PlayerEntity[];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const collision = checkCollision(entities[i], entities[j]);
      if (collision.collided) {
        entities[i].forwardVelocity = -entities[i].forwardVelocity/2;
        entities[j].forwardVelocity = -entities[j].forwardVelocity/2;
      }
    }
  }
}

export default carCollisionSystem;
