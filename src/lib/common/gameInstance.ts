import { World } from 'miniplex';
import { vec3 } from 'wgpu-matrix';

import type { Entity, PlayerEntity } from './systems';
import movementSystem from './systems/movementSystem';
import steeringSystem from './systems/steeringSystem';
import driftCorrectionSystem from './systems/driftCorrectionSystem';

export interface TickContext {
  /**
   * delta time in milliseconds
   */
  deltaTime: number;
}

class GameInstance {
  world: World<Entity>;
  public localPlayerId: string | undefined;

  constructor() {
    this.world = new World<Entity>();
  }

  tick(ctx: TickContext) {
    steeringSystem(this.world, this.localPlayerId);
    movementSystem(this.world, undefined, ctx.deltaTime);
    driftCorrectionSystem(this.world, ctx.deltaTime);
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
      turnAcceleration: 0
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
      isBraking: clientPlayer.isBraking,
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


    // Snapping to authoritative value
    this.world.update(clientPlayer, {
      forwardVelocity: serverPlayer.forwardVelocity,
      forwardAcceleration: serverPlayer.forwardAcceleration,
      turnVelocity: serverPlayer.turnVelocity,
      turnAcceleration: serverPlayer.turnAcceleration,
    });

    // Drift correction

    if (!clientPlayer.positionDrift)
      clientPlayer.positionDrift = [0, 0, 0];
    vec3.sub(serverPlayer.position, clientPlayer.position, clientPlayer.positionDrift);

    clientPlayer.yawDrift = serverPlayer.yawAngle - clientPlayer.yawAngle;

    if (vec3.lenSq(clientPlayer.positionDrift) > 60) {
      vec3.zero(clientPlayer.positionDrift);
      vec3.copy(serverPlayer.position, clientPlayer.position);
    }

    if (Math.abs(clientPlayer.yawDrift) > 2) {
      clientPlayer.yawDrift = 0;
      clientPlayer.yawAngle = serverPlayer.yawAngle;
    }
  }
}

export default GameInstance;
