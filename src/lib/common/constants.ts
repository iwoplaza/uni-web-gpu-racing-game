import type { Entity } from './systems';

export const ServerTickInterval = 1000 / 10; // 10 FPS
export const ClientTickInterval = 1000 / 30; // 30 FPS

export type ClientUpdateField = (typeof ClientUpdateFields)[number];
export const ClientUpdateFields = [
  'isAccelerating',
  'isBraking',
  'isTurningLeft',
  'isTurningRight'
] as const satisfies readonly (keyof Entity)[];
