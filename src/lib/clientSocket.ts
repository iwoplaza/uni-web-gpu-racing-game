import type { With } from 'miniplex';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity } from './common/systems';
import { carGame } from './carGame';
import { get, writable, type Writable } from 'svelte/store';

export class ClientSocket {
  socket: Socket;

  constructor(private gameInstance: GameInstance, endpoint?: string) {
    this.socket = endpoint && endpoint!=="localhost" ? io(endpoint) : io();

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
      this.gameInstance.world.add(entity);
    });

    this.socket.on('disconnect', () => {
      console.log(`Disconnected`);
    });

    this.socket.on('game-update', (entities: Entity[]) => {
      console.log('Received game update');

      // Updating all players
      for (const entity of entities) {
        if (!entity.playerId) {
          continue;
        }

        this.gameInstance.updatePlayer(entity as With<Entity, 'playerId'>);
      }
    });
  }

  dispose() {
    this.socket.disconnect();
  }
}

export const clientSocket: Writable<ClientSocket | null> = writable(null);
export async function connect(gameInstance: GameInstance, endpoint?: string) {
  // Disconnecting previous socket
  disconnect();
  clientSocket.set(new ClientSocket(gameInstance, endpoint));
}

export function disconnect() {
  const socket = get(clientSocket);
  if (!socket) {
    return;
  }
  socket.dispose();
  clientSocket.set(null);
}
