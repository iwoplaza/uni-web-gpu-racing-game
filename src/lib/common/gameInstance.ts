import { World } from 'miniplex';
import { vec3 } from 'wgpu-matrix';

import type { Entity, PlayerEntity } from './systems';
import movementSystem from './systems/movementSystem';
import steeringSystem from './systems/steeringSystem';
import predictionDriftSystem from './systems/predictionDriftSystem';

export interface TickContext {
  /**
   * delta time in milliseconds
   */
  deltaTime: number;
}

class GameInstance {
  world: World<Entity>;

  constructor() {
    this.world = new World<Entity>();
  }

  tick(ctx: TickContext) {
    steeringSystem(this.world);
    movementSystem(this.world, ctx.deltaTime);
    predictionDriftSystem(this.world, ctx.deltaTime);
  }

  addPlayer(playerId: string) {
    const playerEntity: PlayerEntity = {
      playerId,
      position: [0, 0, 0],
      forwardVelocity: 0,
      forwardAcceleration: 0,
      maxForwardVelocity: 0.05,
      maxBackwardVelocity: 0.03,

      yawAngle: 0,
      turnVelocity: 0,
      turnAcceleration: 0,

      positionDrift: [0, 0, 0],
      yawDrift: 0
    };

    console.log(`New player: ${playerId}`);
    this.world.add(playerEntity);
    return playerEntity;
  }

  removePlayer(playerId: string): void {
    const player = this.world.where((e) => e.playerId === playerId).first;

    if (player) {
      console.log(`Player disconnected: ${playerId}`);
      this.world.remove(player);
    }
  }

  syncWithClient(clientPlayer: PlayerEntity) {
    // Finding a server counterpart to the client player
    const serverPlayer = this.world.where(
      (e): e is PlayerEntity => e.playerId === clientPlayer.playerId
    ).first;

    if (!serverPlayer) {
      return;
    }

    this.world.update(serverPlayer, {
      isAccelerating: clientPlayer.isAccelerating,
      isBreaking: clientPlayer.isBreaking,
      isTurningLeft: clientPlayer.isTurningLeft,
      isTurningRight: clientPlayer.isTurningRight
    });
  }

  syncWithServer(serverPlayer: PlayerEntity) {
    // Finding a client counterpart to the server player
    const clientPlayer = this.world.where(
      (e): e is PlayerEntity => e.playerId === serverPlayer.playerId
    ).first;

    if (!clientPlayer) {
      return;
    }

    // -- Snapping to authoritative value
    // this.world.update(clientPlayer, {
    //   position: serverPlayer.position,
    //   forwardVelocity: serverPlayer.forwardVelocity,
    //   forwardAcceleration: serverPlayer.forwardAcceleration,
    //   yawAngle: serverPlayer.yawAngle
    // });

    // -- Correcting drift over time
    this.world.update(clientPlayer, {
      forwardVelocity: serverPlayer.forwardVelocity,
      forwardAcceleration: serverPlayer.forwardAcceleration
    });

    vec3.sub(serverPlayer.position, clientPlayer.position, clientPlayer.positionDrift);
    clientPlayer.yawDrift = serverPlayer.yawAngle - clientPlayer.yawAngle;

    console.log(clientPlayer.positionDrift);
  }
}

export default GameInstance;
