import { get, writable } from 'svelte/store';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity, PlayerEntity } from './common/systems';
import type { Timestamped } from './common/wrapWithTimestamp';
export const latency = writable(0);
export const jitter = writable(0);
export const speedCheat = writable(0);
export const ping = writable(0);
export const maxBitrate = writable(150);
export const packetsLost = writable(0);
export const packetsSent = writable(0);
export const packetsReceived = writable(0);
export const lastSentTime = writable(0);

function updatePing(timestamp: number) {
  const current = Date.now();
  const newPing = Math.abs(current - timestamp);
  ping.set(newPing);
  const received = get(packetsReceived);
  packetsReceived.set(received + 1);
}

// eslint-disable-next-line @typescript-eslint/ban-types
function executeWithDelay(action: Function) {
  return function (timestampedUpdate: Timestamped<object>) {
    const jit = get(jitter);
    const lat = get(latency);
    const delay = lat + Math.random() * jit;
    setTimeout(() => {
      updatePing(timestampedUpdate.timestamp);
      action(timestampedUpdate.value);
    }, delay);
  };
}

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

    this.socket.on(
      'initial-state',
      executeWithDelay((entities: Entity[]) => {
        console.log('Got initial state');

        this.gameInstance.world.clear();
        for (const entity of entities) {
          this.gameInstance.world.add(entity);
        }
      })
    );

    this.socket.on(
      'player-connected',
      executeWithDelay((entity: Entity) => {
        this.gameInstance.world.add(entity);
      })
    );

    this.socket.on(
      'player-left',
      executeWithDelay((playerId: string) => {
        const playerEntity = this.gameInstance.world.where((e) => e.playerId === playerId).first;

        if (playerEntity) {
          this.gameInstance.world.remove(playerEntity);
        }
      })
    );

    this.socket.on('disconnect', () => {
      console.log(`Disconnected`);
    });

    this.socket.on(
      'game-update',
      executeWithDelay((entities: Entity[]) => {
        for (const entity of entities) {
          if (!entity.playerId) {
            continue;
          }

          this.gameInstance.syncWithServer(entity as PlayerEntity);
        }
      })
    );
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
