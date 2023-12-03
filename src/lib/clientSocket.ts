import type { With } from 'miniplex';
import { get, writable } from 'svelte/store';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity } from './common/systems';
import { carGame } from './carGame';
export const latency = writable(0);
export const jitter = writable(0);
export const speedCheat = writable(0);

export class ClientSocket {
  socket: Socket;

  constructor(private gameInstance: GameInstance, endpoint?: string) {
    this.socket = endpoint && endpoint !== 'localhost' ? io(endpoint) : io();

    this.socket.on('connect', () => {
      console.log(`Connected to server`);
      if (carGame) {
        carGame.myId = this.socket.id;
      }
    });

    this.socket.on('initial-state', (entities: Entity[]) => {
      console.log('Got initial state');

      this.gameInstance.world.clear();
      for (const entity of entities) {
        this.gameInstance.world.add(entity);
      }
    });

    this.socket.on('player-connected', (entity: Entity) => {
      const jit = get(jitter);
      const lat = get(latency);
      const delay = lat + Math.random() * jit;
      setTimeout(() => {
        this.gameInstance.world.add(entity);
      }, delay);
    });

    this.socket.on('player-left', (playerId: string) => {
      const playerEntity = this.gameInstance.world.where((e) => e.playerId === playerId).first;

      if (playerEntity) {
        this.gameInstance.world.remove(playerEntity);
      }
    });

    this.socket.on('disconnect', () => {
      console.log(`Disconnected`);
    });

    this.socket.on('game-update', (entities: Entity[]) => {
      // console.log('Received game update');

      // Updating all players
      const jit = get(jitter);
      const lat = get(latency);
      const delay = lat + Math.random() * jit;
      setTimeout(() => {
        for (const entity of entities) {
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
