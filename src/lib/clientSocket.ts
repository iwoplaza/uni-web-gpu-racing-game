import type { With } from 'miniplex';
import io, { Socket } from 'socket.io-client';

import type GameInstance from './common/gameInstance';
import type { Entity } from './common/systems';
import { carGame } from './carGame';

class ClientSocket {
  socket: Socket;

  constructor(private gameInstance: GameInstance, endpoint?: string) {
    this.socket = endpoint ? io(endpoint) : io();

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

export let clientSocket: ClientSocket | null = null;

export async function connect(gameInstance: GameInstance, endpoint?: string) {
  // Disconnecting previous socket
  disconnect();

  clientSocket = new ClientSocket(gameInstance, endpoint);
}

export function disconnect() {
  if (!clientSocket) {
    return;
  }

  clientSocket.dispose();
  clientSocket = null;
}
