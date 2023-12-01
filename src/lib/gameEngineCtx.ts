import type { World } from 'miniplex';

import type SceneInfo from './graphics/sceneInfo';
import type { Entity } from './common/systems';

export interface GameEngineCtx {
  /**
   * Useful for keeping functionality framerate-independent
   */
  readonly deltaTime: number;

  /**
   * Useful for instancing new shapes
   */
  readonly sceneInfo: SceneInfo;

  readonly serverWorld: World<Entity>;
}
