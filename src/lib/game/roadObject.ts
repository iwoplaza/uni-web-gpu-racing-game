import { vec2 } from 'wgpu-matrix';

import type { RoadPoint } from '$lib/common/systems/types';
import type { GameEngineCtx } from '$lib/gameEngineCtx';
import type SceneInfo from '$lib/graphics/sceneInfo';
import type GameObject from '../gameObject';
import { RoadSegmentShape } from './roadSegmentShape';

class RoadObject implements GameObject {
  private segmentShapes: RoadSegmentShape[] = [];
  private dirty = true;

  constructor(roadPoints: RoadPoint[]) {
    console.log(roadPoints);

    for (let i = 0; i < roadPoints.length - 1; i++) {
      const point = roadPoints[i];
      const nextPoint = roadPoints[i + 1];

      const a = point.pos;
      const b = vec2.add(point.pos, point.dir) as [number, number];
      const c = vec2.sub(nextPoint.pos, nextPoint.dir) as [number, number];
      const d = nextPoint.pos;

      this.segmentShapes.push(new RoadSegmentShape([a, b, c, d]));
    }
  }

  dispose(sceneInfo: SceneInfo): void {
    for (const s of this.segmentShapes) {
      sceneInfo.deleteInstance(s);
    }
    this.segmentShapes = [];
  }

  onTick(/* ctx: GameEngineCtx */): void {}

  render(ctx: GameEngineCtx): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    for (const s of this.segmentShapes) {
      ctx.sceneInfo.uploadInstance(s);
    }
  }
}

export default RoadObject;
