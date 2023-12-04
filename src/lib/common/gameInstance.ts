import { World } from 'miniplex';
// import { vec3 } from 'wgpu-matrix';

import type { Entity, PlayerEntity } from './systems';
import movementSystem from './systems/movementSystem';
import steeringSystem from './systems/steeringSystem';

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
    // TODO: #1
    //
    // Update not only the local player, but all players (predict their movements)
    //
    steeringSystem(this.world, this.localPlayerId);
    movementSystem(this.world, this.localPlayerId, ctx.deltaTime);

    // TODO: #3
    //
    // Create a system that corrects drifts.
    //

    // END
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

    // TODO: #7
    //
    // Accept only user input, not state (safety).
    //
    this.world.update(serverPlayer, clientPlayer);
    // END
  }

  syncWithServer(serverPlayer: PlayerEntity) {
    // Finding a client counterpart to the server player
    const clientPlayer = this.world.where(
      (e): e is PlayerEntity => e.playerId === serverPlayer.playerId
    ).first;

    if (!clientPlayer) {
      return;
    }

    // TODO: #6
    //
    // Accept server authoritative updates to local player.
    //
    if (serverPlayer.playerId === this.localPlayerId) {
      return;
    }
    // END

    // Snapping to authoritative value
    this.world.update(clientPlayer, {
      position: serverPlayer.position,
      forwardVelocity: serverPlayer.forwardVelocity,
      forwardAcceleration: serverPlayer.forwardAcceleration,
      yawAngle: serverPlayer.yawAngle
    });

    // TODO: #2
    //
    // Calculate how much the current predictions differ from the latest server update.
    // Store them as 'positionDrift' and 'yawDrift' on the clientPlayer.
    //

    // END
  }
}

export default GameInstance;
