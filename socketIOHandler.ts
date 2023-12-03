import type http from 'node:http';
import { Server } from 'socket.io';

import GameInstance from './src/lib/common/gameInstance';
import { wrapWithTimestamp, type Timestamped } from './src/lib/common/wrapWithTimestamp';
import type { PlayerEntity } from './src/lib/common/systems';
const TICK_RATE = 1000 / 30; // 30 FPS

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const gameInstance = new GameInstance();

  setInterval(() => {
    gameInstance.tick();

    const state = gameInstance.world.entities;
    io.emit('game-update', wrapWithTimestamp(state));
  }, TICK_RATE);

  io.on('connection', (socket) => {
    socket.emit('initial-state', wrapWithTimestamp(gameInstance.world.entities));

    const playerEntity = gameInstance.addPlayer(socket.id);
    socket.on('disconnect', () => {
      gameInstance.removePlayer(socket.id);

      io.emit('player-left', wrapWithTimestamp(socket.id));
    });
    socket.on('send-game-update', (update: Timestamped<PlayerEntity>) => {
      console.log({ id: socket.id, velcity: playerEntity.velocity });
      gameInstance.updatePlayer(update.value);
    });

    io.emit('player-connected', wrapWithTimestamp(playerEntity));
  });

  console.log('SocketIO injected');
}
