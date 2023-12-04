import type http from 'node:http';
import { Server } from 'socket.io';

import GameInstance from './src/lib/common/gameInstance';

const TICK_INTERVAL = 1000 / 10; // 10 FPS

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const gameInstance = new GameInstance();

  setInterval(() => {
    gameInstance.tick({
      deltaTime: TICK_INTERVAL
    });

    const state = gameInstance.world.entities;
    io.emit('game-update', state);
  }, TICK_INTERVAL);

  io.on('connection', (socket) => {
    socket.emit('initial-state', gameInstance.world.entities);

    const playerEntity = gameInstance.addPlayer(socket.id);
    socket.on('disconnect', () => {
      gameInstance.removePlayer(socket.id);

      io.emit('player-left', socket.id);
    });

    socket.on('send-game-update', (playerEntity) => {
      gameInstance.syncWithClient(playerEntity);
    });

    io.emit('player-connected', playerEntity);
  });

  console.log('SocketIO injected');
}
