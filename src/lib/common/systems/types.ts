import type { With } from 'miniplex';

export type Entity = {
  playerId?: string;
  // car properties
  maxForwardVelocity?: number;
  maxBackwardVelocity?: number;
  codeName?: string;

  position?: [number, number, number];
  forwardVelocity?: number;
  forwardAcceleration?: number;

  yawAngle?: number;
  turnVelocity?: number;
  turnAcceleration?: number;

  // Tire condition starts full and degrades with time
  tireCondition?: number;
  inPitStop?: boolean;

  // User input
  isAccelerating?: boolean;
  isBraking?: boolean;
  isTurningRight?: boolean;
  isTurningLeft?: boolean;

  // Prediction drift
  positionDrift?: [number, number, number];
  yawDrift?: number;

  // Track
  roadPoints?: RoadPoint[];

  // Game state
  gameState?: GameState;
  lastCrossTime?: number;
};

export type GameState = {
  customMessage?: string;
  inLobby?: boolean;
  inGame?: boolean;
  showingLeaderboard?: boolean;
  controlsDisabled?: boolean;
  leaderboard?: { playerId: string; loops: number, winner: string }[];
  playersReady?: { playerId: string; ready: boolean}[];
};
export type RoadPoint = { pos: [number, number]; dir: [number, number] };

export type PlayerEntity = With<
  Entity,
  | 'playerId'
  | 'position'
  | 'forwardVelocity'
  | 'forwardAcceleration'
  | 'maxForwardVelocity'
  | 'maxBackwardVelocity'
  | 'turnAcceleration'
  | 'turnVelocity'
  | 'yawAngle'
  | 'codeName'
  | 'lastCrossTime'
>;