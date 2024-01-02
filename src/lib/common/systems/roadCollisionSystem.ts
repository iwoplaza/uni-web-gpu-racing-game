import type { World } from 'miniplex';
import { vec2, vec3, vec4, mat4 } from 'wgpu-matrix';

import type { Entity } from './types';
import { sampleRoadSplineSDF, sampleRoadSplineNormal } from '../roadSplineSDF';

const zPosVec = vec4.fromValues(0, 0, 1, 0);

function roadCollisionSystem(world: World<Entity>, deltaTime: number) {
  const players = world.with(
    'position',
    'forwardVelocity',
    'forwardAcceleration',
    'maxForwardVelocity',
    'maxBackwardVelocity',

    'yawAngle',
    'turnVelocity',
    'turnAcceleration'
  );

  const trackSettings = world.with('roadPoints').first!;

  for (const entity of players) {
    const xz = [entity.position[0], entity.position[2]];
    const dist = sampleRoadSplineSDF(xz, trackSettings.roadPoints) - 14;
    const normal = sampleRoadSplineNormal(xz, trackSettings.roadPoints);
    vec2.normalize(normal, normal);

    if (dist > 0) {
      const forward = vec4.transformMat4(zPosVec, mat4.rotationY(entity.yawAngle));
      const forwardDot = vec2.dot(normal, [forward[0], forward[2]]);
      entity.forwardVelocity -= ((forwardDot * dist) / deltaTime) * 0.2;

      vec3.addScaled(entity.position, [normal[0], 0, normal[1]], -dist, entity.position);
    }
  }
}

export default roadCollisionSystem;
