import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { World } from 'miniplex';
import { playerEntity } from './types';
import { vec3 } from 'gl-matrix';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const world = new World<playerEntity>();
const TICK_RATE = 1000 / 60; // 60 FPS

io.on('connection', (socket) => {
	console.log('a user connected', socket.id);

	const playerEntity: playerEntity = {
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
		vec3.add(entity.position, entity.position, entity.velocity);
	}
}

setInterval(() => {
	movementSystem();
	const state = world.entities;
	io.emit('gameUpdate', state);
}, TICK_RATE);
