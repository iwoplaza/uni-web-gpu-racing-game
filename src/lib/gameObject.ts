import type { GameEngineCtx } from './gameEngineCtx';
import type SceneInfo from './graphics/sceneInfo';

interface GameObject {
  dispose?(sceneInfo: SceneInfo): void;
  render(ctx: GameEngineCtx): void;
}

export default GameObject;
