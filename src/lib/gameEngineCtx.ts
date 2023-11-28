import type SceneInfo from './graphics/sceneInfo';

export interface GameEngineCtx {
	/**
	 * Useful for keeping functionality framerate-independent
	 */
	readonly deltaTime: number;

	/**
	 * Useful for instancing new shapes
	 */
	readonly sceneInfo: SceneInfo;
}
