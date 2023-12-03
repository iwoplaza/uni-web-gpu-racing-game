import CarObject from './carObject';
import type GameObject from './gameObject';
import type { Game } from './gameEngine';
import type GameInstance from './common/gameInstance';
import type { GameEngineCtx } from './gameEngineCtx';
import type SceneInfo from './graphics/sceneInfo';
import { InputHandler } from './inputHandler';

export let carGame: CarGame | null = null;

export function createCarGame(gameInstance: GameInstance) {
  carGame = new CarGame(gameInstance);
  return carGame;
}

class CarGame implements Game {
  public myId: string | null = null;
  private playerIdToCarMap = new Map<string, CarObject>();
  private myCar: CarObject | undefined;
  private objects: GameObject[] = [];
  private readonly inputHandler: InputHandler;

  constructor(public readonly gameInstance: GameInstance) {
    this.inputHandler = new InputHandler();
  }

  init(sceneInfo: SceneInfo): void {
    this.gameInstance.onPlayerUpdated = (player) => {
      const car = this.playerIdToCarMap.get(player.playerId);
      if (!car) {
        return;
      }

      car.onServerUpdate();
    };

    this.gameInstance.world.onEntityAdded.subscribe((e) => {
      if (e.playerId) {
        console.log(`New player joined!: ${e.playerId}`);
        const car = new CarObject(e.playerId, e, [0, 0, 0]);
        this.playerIdToCarMap.set(e.playerId, car);
        this.objects.push(car);

        if (e.playerId === this.myId) {
          this.myCar = car;
          this.inputHandler.car = car;
        }
      }
    });

    this.gameInstance.world.onEntityRemoved.subscribe((e) => {
      if (e.playerId) {
        console.log(`Player left!: ${e.playerId}`);
        const car = this.playerIdToCarMap.get(e.playerId);
        car?.dispose(sceneInfo);

        this.objects = this.objects.filter((o) => o !== car);
        this.playerIdToCarMap.delete(e.playerId);

        if (e.playerId === this.myId) {
          this.myCar = undefined;
          this.inputHandler.car = null;
        }
      }
    });
  }

  onRender(ctx: GameEngineCtx) {
    if (this.myCar) {
      ctx.sceneInfo.camera.parentMatrix = this.myCar.worldMatrix;
    }

    for (const obj of this.objects) {
      obj.render(ctx);
    }
  }
}

export default CarGame;
