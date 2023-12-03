import type { With } from 'miniplex';
import { get, writable } from 'svelte/store';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity } from './common/systems';
import { carGame } from './carGame';
import type { Timestamped } from './common/wrapWithTimestamp';
export const latency = writable(0);
export const jitter = writable(0);
export const speedCheat = writable(0);
export const ping = writable(0);

function updatePing(serverDate: number) {
  const current = Date.now();
  const newPing = Math.abs(current - serverDate);
  ping.set(newPing);
}
export class ClientSocket {
  socket: Socket;

  constructor(private gameInstance: GameInstance, endpoint?: string) {
    const socketOptions = {
      autoConnect: false
    };

    this.socket =
      endpoint && endpoint !== 'localhost' ? io(endpoint, socketOptions) : io(socketOptions);

    this.socket.on('connect', () => {
      console.log(`Connected to server`);
      if (carGame) {
        carGame.myId = this.socket.id;
      }
    });

    this.socket.on('initial-state', (update: Timestamped<Entity[]>) => {
      console.log('Got initial state');

      this.gameInstance.world.clear();
      for (const entity of update.value) {
        this.gameInstance.world.add(entity);
      }
    });

    this.socket.on('player-connected', (update: Timestamped<Entity>) => {
      const jit = get(jitter);
      const lat = get(latency);
      const delay = lat + Math.random() * jit;

      setTimeout(() => {
        this.gameInstance.world.add(update.value);
      }, delay);
    });

    this.socket.on('player-left', (update: Timestamped<string>) => {
      const playerEntity = this.gameInstance.world.where((e) => e.playerId === update.value).first;

      if (playerEntity) {
        this.gameInstance.world.remove(playerEntity);
      }
    });

    this.socket.on('disconnect', () => {
      console.log(`Disconnected`);
    });

    this.socket.on('game-update', (update: Timestamped<Entity[]>) => {
      // console.log('Received game update');

      // Updating all players
      const jit = get(jitter);
      const lat = get(latency);
      const delay = lat + Math.random() * jit;
      setTimeout(() => {
        updatePing(update.timestamp);

        for (const entity of update.value) {
          if (!entity.playerId) {
            continue;
          }

          this.gameInstance.updatePlayer(entity as With<Entity, 'playerId'>);
        }
      }, delay);
    });
  }

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
  let latestValue = getStorage()?.getItem('server-address') ?? null;

  const { subscribe, set } = writable<string | null>(latestValue);

  return {
    subscribe,
    get() {
      return latestValue;
    },
    set(value: string | null) {
      latestValue = value;
      if (value !== null) {
        getStorage()?.setItem('server-address', value);
      } else {
        getStorage()?.removeItem('server-address');
      }
      set(value);
    }
  };
})();
