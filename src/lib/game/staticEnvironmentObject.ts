import { vec2 } from 'wgpu-matrix';

import type { RoadPoint } from '$lib/common/systems/types';
import type { GameEngineCtx } from '$lib/gameEngineCtx';
import type SceneInfo from '$lib/graphics/sceneInfo';
import type GameObject from '../gameObject';
import { sampleRoadSplineSDF } from '../common/roadSplineSDF';
import StaticEnvironmentShape, {
  MaxNoGrassZones,
  MaxRoadAnchors,
  noGrassZones,
  noGrassZonesCount,
  roadAnchorsBuffer,
  roadAnchorsCount
} from './staticEnvironmentShape';

class StaticEnvironmentObject implements GameObject {
  private baseShape: StaticEnvironmentShape;

  private amountOfAnchors: number = 0;
  private anchors: [number, number][] = new Array(MaxRoadAnchors).fill(null).map(() => [0, 0]);

  private amountOfNoGrassZones = 0;
  private noGrassZones: [number, number, number, number][] = new Array(MaxNoGrassZones)
    .fill(null)
    .map(() => [0, 0, 1, 1]);

  private dirty = true;

  constructor(roadPoints: RoadPoint[]) {
    for (let i = 0; i < roadPoints.length - 1; i++) {
      const point = roadPoints[i];
      const nextPoint = roadPoints[i + 1];

      const a = point.pos;
      const b = [...vec2.add(point.pos, point.dir).values()] as [number, number];
      const c = [...vec2.sub(nextPoint.pos, nextPoint.dir).values()] as [number, number];
      const d = nextPoint.pos;

      this.anchors[i * 4 + 0] = a;
      this.anchors[i * 4 + 1] = b;
      this.anchors[i * 4 + 2] = c;
      this.anchors[i * 4 + 3] = d;
      this.amountOfAnchors += 4;

      if (this.amountOfAnchors >= MaxRoadAnchors) {
        throw new Error(`Exceeded max road anchor amount`);
      }
    }

    // generating no grass zones
    const anchorXs = this.anchors.map((a) => a[0]);
    const anchorYs = this.anchors.map((a) => a[1]);

    const minX = anchorXs.reduce((a, b) => Math.min(a, b));
    const maxX = anchorXs.reduce((a, b) => Math.max(a, b));

    const minY = anchorYs.reduce((a, b) => Math.min(a, b));
    const maxY = anchorYs.reduce((a, b) => Math.max(a, b));

    const resolution = 8;
    const stepX = (maxX - minX) / resolution;
    const stepY = (maxY - minY) / resolution;

    for (let i = 0; i < resolution; ++i) {
      for (let j = 0; j < resolution; ++j) {
        const x = minX + i * stepX;
        const y = minY + j * stepY;
        const roadSpline = sampleRoadSplineSDF([x + stepX / 2, y + stepY / 2], roadPoints);

        if (roadSpline < 20.0) {
          this.noGrassZones[this.amountOfNoGrassZones] = [
            x + stepX / 2,
            y + stepY / 2,
            stepX,
            stepY
          ];
          this.amountOfNoGrassZones++;

          if (this.amountOfNoGrassZones >= MaxNoGrassZones) {
            break;
          }
        }
      }
    }

    this.baseShape = new StaticEnvironmentShape();
  }

  dispose(sceneInfo: SceneInfo): void {
    sceneInfo.deleteInstance(this.baseShape);
  }

  onTick(/* ctx: GameEngineCtx */): void {}

  render(ctx: GameEngineCtx): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    roadAnchorsCount.write(ctx.runtime, this.amountOfAnchors);
    roadAnchorsBuffer.write(ctx.runtime, this.anchors);

    noGrassZonesCount.write(ctx.runtime, this.amountOfNoGrassZones);
    noGrassZones.write(ctx.runtime, this.noGrassZones);

    ctx.sceneInfo.uploadInstance(this.baseShape);
  }
}

export default StaticEnvironmentObject;
