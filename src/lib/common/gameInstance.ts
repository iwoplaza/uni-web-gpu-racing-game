import { World, type With } from 'miniplex';

import type { Entity, PlayerEntity } from './systems';
import movementSystem from './systems/movementSystem';

class GameInstance {
  world: World<Entity>;
  onPlayerUpdated: ((entity: PlayerEntity) => void) | null = null;

  constructor() {
    this.world = new World<Entity>();
  }

  tick() {
    movementSystem(this.world);
  }

  addPlayer(playerId: string) {
    const playerEntity: Entity = {
      playerId,
      position: [0, 0, 0],
      velocity: [0, 0, 0.5]
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

  updatePlayer(serverPlayer: With<Entity, 'playerId'>) {
    const clientPlayer = this.world.where(
      (e): e is PlayerEntity => e.playerId === serverPlayer.playerId
    ).first;

    if (clientPlayer) {
      this.world.update(clientPlayer, serverPlayer);
      this.onPlayerUpdated?.(clientPlayer);
    }
  }
}

export default GameInstance;
