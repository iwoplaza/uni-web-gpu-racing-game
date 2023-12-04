import type { With } from 'miniplex';

export type Entity = {
  playerId?: string;
  // car properties
  maxForwardVelocity?: number;
  maxBackwardVelocity?: number;

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
