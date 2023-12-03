import type http from 'node:http';
import { Server, Socket } from 'socket.io';

import GameInstance from './src/lib/common/gameInstance';
import { wrapWithTimestamp, type Timestamped } from './src/lib/common/wrapWithTimestamp';
import type { PlayerEntity } from './src/lib/common/systems';
const TICK_RATE = 1000 / 30; // 30 FPS

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const gameInstance = new GameInstance();

  function emit(name: string, data: object | string) {
    // TODO data compresssion
    // io.emit(name, wrapWithTimestamp(compress(data)))
    io.emit(name, wrapWithTimestamp(data));
  }
  function socketEmit(socket: Socket, name: string, data: object) {
    // TODO data compresssion
    // socket.emit(name, wrapWithTimestamp(compress(data)))
    socket.emit(name, wrapWithTimestamp(data));
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  function unwrapTimestamped(action: Function) {
    return function (timestampedUpdate: Timestamped<object>) {
      // TODO data decompresssion
      // action(decompresss(timestampedUpdate.value)
      action(timestampedUpdate.value);
    };
  }

  setInterval(() => {
    gameInstance.tick();

    const state = gameInstance.world.entities;
    emit('game-update', state);
  }, TICK_RATE);

  io.on('connection', (socket) => {
    socketEmit(socket, 'initial-state', gameInstance.world.entities);

    const playerEntity = gameInstance.addPlayer(socket.id);
    socket.on('disconnect', () => {
      gameInstance.removePlayer(socket.id);
      emit('player-left', socket.id);
    });

    socket.on(
      'send-game-update',
      unwrapTimestamped((player: PlayerEntity) => {
        gameInstance.updatePlayer(player);
      })
    );

    emit('player-connected', playerEntity);
  });

  console.log('SocketIO injected');
}
