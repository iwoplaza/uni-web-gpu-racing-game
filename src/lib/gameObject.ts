import type { GameEngineCtx } from './gameEngineCtx';

interface GameObject {
	render(ctx: GameEngineCtx): void;
}

export default GameObject;
