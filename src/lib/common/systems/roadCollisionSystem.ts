import type { World } from 'miniplex';
import { vec2, vec3, type Vec2, vec4, mat4 } from 'wgpu-matrix';

import type { Entity, RoadPoint } from './types';
import { cubicBezier2 } from '../bezier';

const zPosVec = vec4.fromValues(0, 0, 1, 0);

function trackSDF(p: Vec2, roadPoints: RoadPoint[]) {
  let minDist = 100000;

  for (let i = 0; i < roadPoints.length - 1; i++) {
    const point = roadPoints[i];
    const nextPoint = roadPoints[i + 1];

    const a = point.pos;
    const b = vec2.add(point.pos, point.dir);
    const c = vec2.sub(nextPoint.pos, nextPoint.dir);
    const d = nextPoint.pos;

    minDist = Math.min(minDist, cubicBezier2(p, a, b, c, d));
  }

  return minDist;
}

function sampleNormal(point: Vec2, roadPoints: RoadPoint[]) {
  const [x, z] = point;
  const epsilon = 0.001; // arbitrary - should be smaller than any surface detail in your distance function, but not so small as to get lost in float precision
  const offX = vec2.fromValues(x + epsilon, z);
  const offZ = vec2.fromValues(x, z + epsilon);

  const centerDistance = trackSDF(point, roadPoints);
  const xDistance = trackSDF(offX, roadPoints);
  const zDistance = trackSDF(offZ, roadPoints);

  return [(xDistance - centerDistance) / epsilon, (zDistance - centerDistance) / epsilon];
}

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
    const dist = trackSDF(xz, trackSettings.roadPoints) - 14;
    const normal = sampleNormal(xz, trackSettings.roadPoints);
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
