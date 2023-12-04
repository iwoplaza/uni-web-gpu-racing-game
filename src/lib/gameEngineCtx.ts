import type SceneInfo from './graphics/sceneInfo';

export interface GameEngineCtx {
  /**
   * Useful for keeping functionality framerate-independent
   */
  readonly deltaTime: number;

  /**
   * Partial tick (0 to 1)
   */
  readonly pt: number;

  /**
   * Useful for instancing new shapes
   */
  readonly sceneInfo: SceneInfo;
}
