import type { With } from 'miniplex';

export type Entity = {
  playerId?: string;
  position: [number, number, number];
  velocity: [number, number, number];
  maxVelocity?: number;
  acceleration?: number;
  turnRate?: number;

  // Tire condition starts full and degrades with time
  tireCondition?: number;
  inPitStop?: boolean;

  // User input
  isAccelerating?: boolean;
  isBreaking?: boolean;
  isTurningRight?: boolean;
  isTurningLeft?: boolean;
};

export type PlayerEntity = With<Entity, 'playerId'>;
