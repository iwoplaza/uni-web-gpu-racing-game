import CarObject from './carObject';
import type GameObject from './gameObject';
import type { Game } from './gameEngine';
import GameInstance from './common/gameInstance';
import type { Entity, PlayerEntity } from './common/systems';
import { ClientTickInterval } from './common/constants';
import type { GameEngineCtx } from './gameEngineCtx';
import type SceneInfo from './graphics/sceneInfo';
import { InputHandler } from './inputHandler';
import { ClientSocket, serverAddress } from './clientSocket';
import GameEngine from './gameEngine';
import { sendUpdate } from './utils/sendUpdate';
import _ from 'lodash';

let gameEngine: GameEngine | undefined = undefined;
export let carGame: CarGame | undefined = undefined;

export function createCarGame(canvas: HTMLCanvasElement) {
  const endpoint = serverAddress.get();

  if (!endpoint) {
    return;
  }

  carGame = new CarGame(endpoint);
  gameEngine = new GameEngine(carGame, ClientTickInterval);
  gameEngine.start(canvas);
}

export function disposeCarGame() {
  gameEngine?.dispose();
  gameEngine = undefined;
  carGame = undefined;
}

export function connect(canvas: HTMLCanvasElement, endpoint: string) {
  serverAddress.set(endpoint);

  createCarGame(canvas);
}

export function disconnect() {
  serverAddress.set(null);

  disposeCarGame();
}

const ClientUpdateFields = (['isAccelerating', 'isBraking', 'isTurningLeft', 'isTurningRight'] as const) satisfies readonly (keyof Entity)[];

class CarGame implements Game {
  private myId: string | null = null;
  private playerIdToCarMap = new Map<string, CarObject>();
  private objects: GameObject[] = [];
  private readonly inputHandler: InputHandler;
  private readonly gameInstance = new GameInstance();
  public readonly clientSocket;

  private myCar: CarObject | undefined;
  private previouslySentState: Pick<PlayerEntity, typeof ClientUpdateFields[number]> | null = null;

  constructor(endpoint: string) {
    this.inputHandler = new InputHandler();
    this.clientSocket = new ClientSocket(this.gameInstance, endpoint, (socketId) => {
      this.myId = socketId;
      this.gameInstance.localPlayerId = socketId;
    });
  }

  init(sceneInfo: SceneInfo): void {
    this.gameInstance.world.onEntityAdded.subscribe((e) => {
      if (e.playerId) {
        console.log(`New player joined!: ${e.playerId}`);
        const car = new CarObject(e.playerId, e as PlayerEntity);
        this.playerIdToCarMap.set(e.playerId, car);
        this.objects.push(car);

        if (e.playerId === this.myId) {
          this.myCar = car;
          console.log(`I am ${this.myId}`);
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

    this.clientSocket.connect();
  }

  dispose() {
    this.clientSocket.dispose();
  }

  sendLocalUpdates() {
    if (!this.myCar) {
      return;
    }

    const myCar = this.myCar;
    const sameAsLastUpdate = ClientUpdateFields.every(field => this.previouslySentState && this.previouslySentState[field] === myCar.entity[field]);

    if (!this.previouslySentState || !sameAsLastUpdate) {
      this.previouslySentState = _.pick(myCar.entity, ClientUpdateFields);
      sendUpdate('send-game-update', this.previouslySentState);
    }
  }

  onTick(ctx: GameEngineCtx): void {
    this.gameInstance.tick({
      deltaTime: ctx.deltaTime
    });

    for (const obj of this.objects) {
      obj.onTick(ctx);
    }

    this.sendLocalUpdates();
  }

  onRender(ctx: GameEngineCtx) {
    if (this.myCar) {
      ctx.sceneInfo.camera.parentMatrix = this.myCar.worldMatrix(ctx.pt);
    }

    for (const obj of this.objects) {
      obj.render(ctx);
    }
  }
}

export default CarGame;
