import type { GameEngineCtx } from '$lib/gameEngineCtx';
import type SceneInfo from '$lib/graphics/sceneInfo';
import type GameObject from '../gameObject';
import { RoadSegmentShape } from './roadSegmentShape';

class RoadObject implements GameObject {
  private segmentShapes: RoadSegmentShape[];
  private dirty = true;

  constructor() {
    this.segmentShapes = [
      new RoadSegmentShape([
        [0, -100],
        [30, -60],
        [-10, -20],
        [0, 20]
      ]),
      new RoadSegmentShape([
        [0, 20],
        [10, 60],
        [20, 100],
        [50, 140]
      ])
    ];
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
