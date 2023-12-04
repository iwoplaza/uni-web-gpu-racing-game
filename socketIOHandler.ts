import type http from 'node:http';
import { Server, Socket } from 'socket.io';

import { ServerTickInterval } from './src/lib/common/constants';
import GameInstance from './src/lib/common/gameInstance';
import { wrapWithTimestamp, type Timestamped } from './src/lib/common/wrapWithTimestamp';
import type { PlayerEntity } from './src/lib/common/systems';

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const gameInstance = new GameInstance();

  function emitToAll(name: string, data: object | string) {
    io.emit(name, wrapWithTimestamp(data));
  }

  function emitToOne(socket: Socket, name: string, data: object) {
    socket.emit(name, wrapWithTimestamp(data));
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  function unwrapTimestamped(action: Function) {
    return function (timestampedUpdate: Timestamped<object>) {
      action(timestampedUpdate.value);
    };
  }

  setInterval(() => {
    // TODO: #5
    //
    // Run the game-logic on the server as well
    //

    // END

    const state = gameInstance.world.entities;
    emitToAll('game-update', state);
  }, ServerTickInterval);

  io.on('connection', (socket) => {
    emitToOne(socket, 'initial-state', gameInstance.world.entities);

    const playerEntity = gameInstance.addPlayer(socket.id);
    socket.on('disconnect', () => {
      gameInstance.removePlayer(socket.id);
      emitToAll('player-left', socket.id);
    });

    socket.on(
      'send-game-update',
      unwrapTimestamped((player: PlayerEntity) => {
        gameInstance.syncWithClient({ ...player, playerId: socket.id });
      })
    );

    emitToAll('player-connected', playerEntity);
  });

  console.log('SocketIO injected');
}
