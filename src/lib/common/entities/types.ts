import type { Vec3 } from 'wgpu-matrix';

export type PlayerEntity = {
  playerId: string;
  position: Vec3;
  velocity: Vec3;
};
