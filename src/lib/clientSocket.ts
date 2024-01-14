import { get, writable } from 'svelte/store';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity, PlayerEntity } from './common/systems';
import pipeline, { type Middleware } from './common/pipeline';
import ScheduledTaskQueue from './common/scheduledTaskQueue';
import { measurePingMiddleware } from './common/ping';
import {
  extractTimestampMiddleware,
  timestampMiddleware,
  type Timestamped
} from './common/timestampMiddleware';
import type { ClientUpdateField } from './common/constants';
import type { GameState } from './common/systems/types';
import gameStateStore from './gameStateStore';

export const latency = writable(0);
export const jitter = writable(0);
export const maxBitrate = writable(150);
export const packetsLost = writable(0);
export const lastSentTime = writable(0);

const fakeDelayMiddleware = <T>(queue: ScheduledTaskQueue): Middleware<T, T> => {
  return (value, next) => {
    const jit = get(jitter);
    const lat = get(latency);
    const delay = lat + Math.random() * jit;

    // Keeping payloads in a queue makes sure they get sent
    // in the right order
    queue.schedule(Date.now() + delay, () => next(value));
  };
};

const taskQueue = new ScheduledTaskQueue();

export class ClientSocket {
  socket: Socket;

  constructor(
    private gameInstance: GameInstance,
    endpoint: string,
    onConnected: (socketId: string) => void
  ) {
    const socketOptions = {
      autoConnect: false
    };

    this.socket =
      endpoint && endpoint !== 'localhost' ? io(endpoint, socketOptions) : io(socketOptions);

    this.socket.on('connect', () => {
      console.log(`Connected to server`);
      onConnected(this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log(`Disconnected`);
    });

    this.socket.on(
      'initial-state',
      pipeline<Timestamped<Entity[]>>()
        .use(fakeDelayMiddleware(taskQueue)) //
        .use(measurePingMiddleware()) //
        .use(extractTimestampMiddleware()) //
        .finally((entities) => {
          console.log('Got initial state');

          this.gameInstance.world.clear();
          for (const entity of entities) {
            this.gameInstance.world.add(entity);
          }
        })
    );

    this.socket.on(
      'player-connected',
      pipeline<Timestamped<Entity>>()
        .use(fakeDelayMiddleware(taskQueue)) //
        .use(measurePingMiddleware()) //
        .use(extractTimestampMiddleware()) //
        .finally((entity) => {
          this.gameInstance.world.add(entity);
        })
    );

    this.socket.on(
      'player-left',
      pipeline<Timestamped<string>>()
        .use(fakeDelayMiddleware(taskQueue)) //
        .use(measurePingMiddleware()) //
        .use(extractTimestampMiddleware()) //
        .finally((playerId) => {
          const playerEntity = this.gameInstance.world.where((e) => e.playerId === playerId).first;

          if (playerEntity) {
            this.gameInstance.world.remove(playerEntity);
          }
        })
    );

    this.socket.on(
      'game-update',
      pipeline<Timestamped<Entity[]>>()
        .use(fakeDelayMiddleware(taskQueue)) //
        .use(measurePingMiddleware()) //
        .use(extractTimestampMiddleware()) //
        .finally((entities) => {
          for (const entity of entities) {
            if (!entity.playerId) {
              continue;
            }

            this.gameInstance.syncWithServer(entity as PlayerEntity);
          }
        })
    );
    this.socket.on(
      'game-state-update',
      pipeline<Timestamped<Entity>>()
        .use(fakeDelayMiddleware(taskQueue)) //
        .use(measurePingMiddleware()) //
        .use(extractTimestampMiddleware()) //
        .finally((update) => {
            const state = update.gameState;
            if (!state) {
              return;
            }
            gameStateStore.set(state);
        })
    );
  }

  sendUserInput = pipeline<Pick<Entity, ClientUpdateField>>() //
    .use(timestampMiddleware())
    .finally((payload) => {
      this.socket.emit('user-input', payload);
    });

  dispose() {
    this.socket.disconnect();
  }

  connect() {
    this.socket.connect();
  }
}

function getStorage() {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    return localStorage;
  }

  return undefined;
}

export const serverAddress = (() => {
  const { subscribe, set } = writable<string | null>(
    getStorage()?.getItem('server-address') ?? null
  );

  return {
    subscribe,
    set(value: string | null) {
      if (value !== null) {
        getStorage()?.setItem('server-address', value);
      } else {
        getStorage()?.removeItem('server-address');
      }
      set(value);
    }
  };
})();
