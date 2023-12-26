import type { WGSLCode } from './wgsl';

export interface ShapeKind {
  readonly shapeCode: WGSLCode;
  readonly materialCode: WGSLCode;
}
