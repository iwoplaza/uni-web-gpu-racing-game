import type { With } from 'miniplex';

export type Entity = {
  playerId?: string;

  position?: [number, number, number];
  forwardVelocity?: number;
  forwardAcceleration?: number;
  maxForwardVelocity?: number;
  maxBackwardVelocity?: number;

  yawAngle?: number;
  turnVelocity?: number;
  turnAcceleration?: number;

  // Tire condition starts full and degrades with time
  tireCondition?: number;
  inPitStop?: boolean;

  // User input
  isAccelerating?: boolean;
  isBreaking?: boolean;
  isTurningRight?: boolean;
  isTurningLeft?: boolean;
};

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
>;
