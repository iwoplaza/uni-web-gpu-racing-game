import { World } from 'miniplex';
import { vec3 } from 'wgpu-matrix';

import { PlayerCodenames, type Entity, type PlayerEntity } from './systems';
import movementSystem from './systems/movementSystem';
import steeringSystem from './systems/steeringSystem';
import driftCorrectionSystem from './systems/driftCorrectionSystem';
import roadCollisionSystem from './systems/roadCollisionSystem';
import carCollisionSystem from './systems/carCollisionSystem';
import GameStateManager from './systems/GameStateManager';

export interface TickContext {
  /**
   * delta time in milliseconds
   */
  deltaTime: number;
}

class GameInstance {
  world: World<Entity>;
  private playerSpawnPositions: Record<string, [number, number, number]>;
  private availableCodenames: string[];
  private playerCodenames: Record<string, string>;
  public localPlayerId: string | undefined;
  public gameStateManager: GameStateManager;

  constructor() {
    this.world = new World<Entity>();
    this.availableCodenames = PlayerCodenames;
    this.playerCodenames = {};
    this.playerSpawnPositions = {
      Alpha: [0, 0, 0],
      Bravo: [6, 0, 0],
      Charlie: [12, 0, 0],
      Delta: [6, 0, 6],
      Echo: [12, 0, 6],
      Foxtrot: [18, 0, 6],
      Golf: [0, 0, 12],
      Hotel: [6, 0, 12]
    };

    this.world.add({
      roadPoints: [
        { pos: [0, -75], dir: [0, 10] },
        { pos: [0, 50], dir: [0, 10] },
        { pos: [-80, 100], dir: [-60, 0] },
        { pos: [-175, 100], dir: [-10, 0] },
        { pos: [-200, 75], dir: [0, -10] },
        { pos: [-200, 0], dir: [0, -10] },
        { pos: [-120, -20], dir: [30, -30] },
        { pos: [-135, -100], dir: [10, 0] },
        { pos: [-25, -100], dir: [10, 0] },
        { pos: [0, -75], dir: [0, 10] }
      ]
    });
    this.world.add({
      gameState: {
        inLobby: true,
        inGame: false,
        showingLeaderboard: false,
        controlsDisabled: true
      }
    });
    this.gameStateManager = new GameStateManager(this.world);
  }

  tick(ctx: TickContext) {
    
    steeringSystem(this.world, this.localPlayerId);
    movementSystem(this.world, undefined, ctx.deltaTime);
    // driftCorrectionSystem(this.world, ctx.deltaTime);
    roadCollisionSystem(this.world, ctx.deltaTime);
    // carCollisionSystem(this.world);
    this.gameStateManager.tick()
  }

  addPlayer(playerId: string) {
    if (this.availableCodenames.length === 0) {
      console.log('No available codenames');
      return null;
    }
    const codeName = this.availableCodenames.shift() as string;
    const spawnPosition = this.playerSpawnPositions[codeName] || [0, 0, 0];

    const playerEntity: PlayerEntity = {
      playerId,
      position: spawnPosition,
      forwardVelocity: 0,
      forwardAcceleration: 0,
      maxForwardVelocity: 0.05,
      maxBackwardVelocity: 0.03,

      yawAngle: 0,
      turnVelocity: 0,
      turnAcceleration: 0,
      codeName
    };
    this.playerCodenames[playerId] = codeName;

    console.log(`New player: ${playerId}, Codename: ${codeName}`);
    this.world.add(playerEntity);
    this.gameStateManager.playerConnected(playerId);
    return playerEntity;
  }

  removePlayer(playerId: string): void {
    const player = this.world.where((e) => e.playerId === playerId).first;

    if (player) {
      console.log(`Player disconnected: ${playerId}`);
      this.world.remove(player);
      const codename = this.playerCodenames[playerId];
      if (codename) {
        this.availableCodenames.push(codename);
        delete this.playerCodenames[playerId];
      }
      this.gameStateManager.playerDisconnected(playerId);
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
      turnAcceleration: serverPlayer.turnAcceleration
    });

    // Drift correction

    if (!clientPlayer.positionDrift) clientPlayer.positionDrift = [0, 0, 0];
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
