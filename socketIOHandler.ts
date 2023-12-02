import type http from 'node:http';
import { Server } from 'socket.io';

import GameInstance from './src/lib/common/gameInstance';

const TICK_RATE = 1000 / 30; // 30 FPS

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const gameInstance = new GameInstance();

  setInterval(() => {
    gameInstance.tick();

    const state = gameInstance.world.entities;
    io.emit('game-update', state);
  }, TICK_RATE);

  io.on('connection', (socket) => {
    socket.emit('initial-state', gameInstance.world.entities);

    const playerEntity = gameInstance.addPlayer(socket.id);
    socket.on('disconnect', () => {
      gameInstance.removePlayer(socket.id);
    });
    socket.on('send-game-update', (playerEntity) => {
      console.log({ id: socket.id  ,velcity: playerEntity.velocity})
      gameInstance.updatePlayer(playerEntity);
    });

    io.emit('player-connected', playerEntity);
  });

  console.log('SocketIO injected');
}
