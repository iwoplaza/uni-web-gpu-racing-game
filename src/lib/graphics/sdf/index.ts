import { applyTransform } from './applyTransform';
export const snippets = {
  applyTransform
};

export * as macros from './macros';

import { inflateWGSL } from './inflateOperator';
import { revolveX, revolveY, revolveZ } from './revolveOperators';
import { extrude } from './extrude';
export const op = {
  union: 'min',
  inflate: inflateWGSL,
  revolveX,
  revolveY,
  revolveZ,
  extrude
};

import { quadBezier2, cubicBezier2 } from './bezier';
import { box2 } from './box2';
import { box3 } from './box3';
export const sdf = {
  quadBezier2,
  cubicBezier2,
  box2,
  box3
};
