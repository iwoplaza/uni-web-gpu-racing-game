import type { World } from 'miniplex';
import type { Entity, GameState, PlayerEntity } from './types';

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
    this.gameState.leaderboard?.push({ playerId, loops: 0, winner: '', });

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

    // players.forEach((player) => {
    //   this.checkAndIncrementLaps(player);
    // });

    const worldState = this.world.with('gameState').first!;
    this.world.update(worldState, { gameState: this.gameState });
  }
  // private checkAndIncrementLaps(player: PlayerEntity) {
  //   const { forwardVelocity } = player;

  //   if (forwardVelocity > 0 && this.isCrossingLine(player)) {
  //     const playerLapData = this.gameState.leaderboard.find((p) => p.playerId === player.playerId);
  //     if (playerLapData) {
  //       playerLapData.loops += 1;
  //     }
  //   } else {
  //     const playerLapData = this.gameState.leaderboard.find((p) => p.playerId === player.playerId);
  //     if (playerLapData) {
  //     }
  //   }
  // }
  private isCrossingLine(player: PlayerEntity): boolean {
    const { position } = player;
    return (
      position[0] === this.startFinishLine.startX &&
      position[1] >= this.startFinishLine.startY &&
      position[1] <= this.startFinishLine.endY
    );
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
    const winner = players.find((player) => this.hasPlayerCompletedLaps(player, 10));
    if (winner) {
      this.endGame(winner);
    }
  }

  private startGame() {
    this.gameState = {
      ...this.gameState,
      inGame: true,
      inLobby: false,
      controlsDisabled: false
    };
  }

  private endGame(winner: PlayerEntity) {
    this.gameState.showingLeaderboard = true;
    this.gameState.leaderboard = [
      { playerId: winner.playerId!, loops: 10, winner: winner.playerId! }
    ];
    this.resetToLobby();
  }

  private resetToLobby() {
    this.gameState = {
      ...this.gameState,
      inLobby: true,
      inGame: false,
      showingLeaderboard: false,
      controlsDisabled: false
    };
  }

  private hasPlayerCompletedLaps(player: PlayerEntity, laps: number): boolean {
    // Implement the logic to check if the player has completed the required laps
    // This might involve tracking the player's progress in the game
    return false; // Placeholder return value
  }
}

export default GameStateManager;
