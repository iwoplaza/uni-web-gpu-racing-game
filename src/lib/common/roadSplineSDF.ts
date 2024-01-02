import { vec2, type Vec2 } from 'wgpu-matrix';

import type { RoadPoint } from './systems/types';
import { cubicBezier2 } from './bezier';

export function sampleRoadSplineSDF(p: Vec2, roadPoints: RoadPoint[]) {
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

export function sampleRoadSplineNormal(point: Vec2, roadPoints: RoadPoint[]) {
  const [x, z] = point;
  const epsilon = 0.001; // arbitrary - should be smaller than any surface detail in your distance function, but not so small as to get lost in float precision
  const offX = vec2.fromValues(x + epsilon, z);
  const offZ = vec2.fromValues(x, z + epsilon);

  const centerDistance = sampleRoadSplineSDF(point, roadPoints);
  const xDistance = sampleRoadSplineSDF(offX, roadPoints);
  const zDistance = sampleRoadSplineSDF(offZ, roadPoints);

  return [(xDistance - centerDistance) / epsilon, (zDistance - centerDistance) / epsilon];
}
