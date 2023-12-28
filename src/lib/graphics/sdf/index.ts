import { applyTransform } from './applyTransform';
export const snippets = {
  applyTransform
};

export * as macros from './macros';

import { inflateWGSL } from './inflateOperator';
import { revolveX, revolveY, revolveZ } from './revolveOperators';
import { extrude } from './extrude';
import { smin } from './sminOperator';
export const op = {
  inflate: inflateWGSL,
  revolveX,
  revolveY,
  revolveZ,
  extrude,
  smin
};

import { quadBezier2, cubicBezier2 } from './bezier';
import { box2 } from './box2';
import { box3 } from './box3';
import { lineSegment2, lineSegment3 } from './lineSegment';
export const sdf = {
  quadBezier2,
  cubicBezier2,
  box2,
  box3,
  lineSegment2,
  lineSegment3
};
