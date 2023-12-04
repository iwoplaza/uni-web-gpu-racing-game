import type { With } from 'miniplex';
import { type Parsed, object, arrayOf, f32, string as str } from 'typed-binary';

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

export const BinaryEntity = object({
  playerId: str,
  position: arrayOf(f32),
  forwardVelocity: f32,
  forwardAcceleration: f32,
  maxForwardVelocity: f32,
  maxBackwardVelocity: f32,
  yawAngle: f32,
  turnVelocity: f32,
  turnAcceleration: f32
});

export type BinaryEntity = Parsed<typeof BinaryEntity>;
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
