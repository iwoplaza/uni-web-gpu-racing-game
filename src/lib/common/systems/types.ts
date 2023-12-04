import type { With } from 'miniplex';
import { type Parsed, object, arrayOf, f32, string as str, bool, i32 } from "typed-binary";


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

export const BinaryEntity = object({
  playerId: str,
  position: arrayOf(f32),
  velocity:  arrayOf(f32),
  maxVelocity: i32,
  acceleration: f32,
  turnRate: f32,
  tireCondition: f32,
  inPitStop: bool,
  isAccelerating: bool,
  isBreaking: bool,
  isTurningRight: bool,
  isTurningLeft: bool,
});
export type BinaryEntity = Parsed<typeof BinaryEntity>;
export type PlayerEntity = With<Entity, 'playerId'>;
