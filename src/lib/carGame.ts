import CarObject from './carObject';
import type GameObject from './gameObject';
import type { Game } from './gameEngine';
import type { GameEngineCtx } from './gameEngineCtx';

class CarGame implements Game {
	private objects: GameObject[] = [];

	init(): void {
		this.objects.push(new CarObject());
	}

	onRender(ctx: GameEngineCtx) {
		for (const obj of this.objects) {
			obj.render(ctx);
		}
	}
}

export default CarGame;
