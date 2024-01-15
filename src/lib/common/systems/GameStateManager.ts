import type { World } from 'miniplex';
import type { Entity, GameState, PlayerEntity } from './types';

const LOOPS = 3;
const DELAY = 30000;
export class GameStateManager {
  private world: World<Entity>; // Assuming World is a class that manages entities
  private gameState: GameState;
  private startFinishLine = { startX: 0, startY: 0, endY: 20 };
  constructor(world: World<Entity>) {
    this.world = world;
    this.gameState = {
      inLobby: true,
      inGame: false,
      showingLeaderboard: false,
      controlsDisabled: false,
      leaderboard: [],
      playersReady: []
    };
  }

  private get Players(): PlayerEntity[] {
    return this.world.where((e): e is PlayerEntity => e.playerId !== undefined)
      .entities as PlayerEntity[];
  }

  playerConnected(playerId: string) {
    // Add player to leaderboard with 0 loops
    this.gameState.leaderboard?.push({ playerId, loops: 0, winner: false });
    this.gameState.leaderboard = this.gameState.leaderboard?.sort((a, b) => b.loops - a.loops);
    // Update players ready list
    this.gameState.playersReady?.push({ playerId, ready: false });

    // Update the game state
    this.updateGameState();
  }

  playerDisconnected(playerId: string) {
    // Remove player from leaderboard and ready list
    this.gameState.leaderboard = this.gameState.leaderboard?.filter((p) => p.playerId !== playerId);
    this.gameState.playersReady = this.gameState.playersReady?.filter(
      (p) => p.playerId !== playerId
    );

    // Update the game state
    this.updateGameState();
  }

  playerSendReady(playerId: string, ready: boolean) {
    const playerReady = this.gameState.playersReady?.find((p) => p.playerId === playerId);
    if (playerReady) {
      playerReady.ready = ready;
    }

    // Update the game state
    this.updateGameState();
  }

  tick() {
    this.updateGameState();
  }

  private updateGameState() {
    const players = this.Players;
    if (players.length === 0) {
      this.resetToLobby();
      return;
    }

    if (this.gameState.inLobby) {
      this.handleLobbyState(players);
    } else if (this.gameState.inGame) {
      this.handleInGameState(players);
    }

    players.forEach((player) => {
      this.checkAndIncrementLaps(player);
    });

    const worldState = this.world.with('gameState').first!;
    this.world.update(worldState, { gameState: this.gameState });
  }
  private checkAndIncrementLaps(player: PlayerEntity) {
    const { forwardVelocity, lastCrossTime } = player;

    // 1. Check if velocity is positive
    if (forwardVelocity <= 0) return;

    // 2. Check if inside box of start/finish
    if (!this.isInsideFinishBox(player)) return;

    // 3. Check latest time update of loop
    const now = Date.now();
    if (lastCrossTime && now - lastCrossTime < DELAY) {
      player.lastCrossTime = now;
      return;
    }

    // Increment lap count and update last cross time
    const playerLapData = this.gameState.leaderboard.find((p) => p.playerId === player.playerId);
    if (playerLapData) {
      playerLapData.loops += 1; // TODO: CHANGE IT BACK
      if (playerLapData.loops >= LOOPS) {
        playerLapData.winner = true;
      }
    }
    player.lastCrossTime = now;
  }
  private isInsideFinishBox(player: PlayerEntity): boolean {
    const { position } = player;
    // Assuming position is [x, y, z]
    return position[0] >= -25 && position[0] <= 25 && position[2] >= -25 && position[2] <= 0;
  }

  private handleLobbyState(players: PlayerEntity[]) {
    this.gameState.controlsDisabled = true;
    const playersReady = this.gameState.playersReady?.filter((pr) => pr.ready) ?? [];
    this.gameState.customMessage = `Players ready (${playersReady.length}/${players.length})`;

    if (players.length >= 2) {
      const allReady = this.gameState.playersReady?.every((pr) => pr.ready) ?? false;
      if (allReady) {
        this.startGame();
      }
    }
  }

  private handleInGameState(players: PlayerEntity[]) {
    const winner = players.find((player) => this.hasPlayerCompletedLaps(player, LOOPS));
    if (winner) {
      this.endGame(winner);
    }
  }

  private startGame() {
    this.gameState = {
      ...this.gameState,
      inGame: true,
      inLobby: false,
      showingLeaderboard: true,
      controlsDisabled: false,
      winningAnimation: false
    };
  }

  private async endGame(winner: PlayerEntity) {
    this.gameState.customMessage = `Winner: ${winner.codeName}`;
    this.gameState.showingLeaderboard = false;
    this.gameState.leaderboard = [
      { playerId: winner.playerId!, loops: LOOPS, winner: true }
    ];
    this.gameState.winningAnimation = true;

    // Delay resetToLobby by 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));
    this.resetToLobby();
    process.exit(0);
  }

  private resetToLobby() {
    this.gameState = {
      ...this.gameState,
      inLobby: true,
      inGame: false,
      showingLeaderboard: false,
      controlsDisabled: false,
      winningAnimation: false,
    };
  }

  private hasPlayerCompletedLaps(player: PlayerEntity, laps: number): boolean {
    if (this.gameState.leaderboard) {
      const playerLapData = this.gameState.leaderboard.find((p) => p.playerId === player.playerId);
      if (playerLapData) {
        return playerLapData.loops >= laps;
      }
    }
    return false;
  }
}

export default GameStateManager;
