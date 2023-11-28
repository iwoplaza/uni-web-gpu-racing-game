import { World } from 'miniplex';
import type http from 'node:http';
import { Server } from 'socket.io';
import { vec3 } from 'wgpu-matrix';

import type { PlayerEntity } from '$lib/common/entities/types';

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server);

  const world = new World<PlayerEntity>();
  const TICK_RATE = 1000 / 60; // 60 FPS

  io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    const playerEntity: PlayerEntity = {
      position: vec3.fromValues(0, 0, 0),
      velocity: vec3.fromValues(0, 0, 0),
      playerId: socket.id
    };
    world.add(playerEntity);
    socket.on('disconnect', () => {
      console.log('user disconnected', socket.id);
      world.where((p) => p.playerId == socket.id);
    });
  });

  function movementSystem() {
    const movingEntities = world.with('position', 'velocity');
    for (const entity of movingEntities) {
      vec3.add(entity.position, entity.velocity, entity.position);
    }
  }

  setInterval(() => {
    movementSystem();
    const state = world.entities;
    io.emit('gameUpdate', state);
  }, TICK_RATE);

  console.log('SocketIO injected');
}
