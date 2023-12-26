import { applyTransform } from './applyTransform';
export const snippets = {
  applyTransform
};

import { inflateWGSL } from './inflateOperator';
import { revolveX, revolveY, revolveZ } from './revolveOperators';
export const op = {
  union: 'min',
  inflate: inflateWGSL,
  revolveX,
  revolveY,
  revolveZ
};

import { box2 } from './box2';
import { box3 } from './box3';
export const sdf = {
  box2,
  box3
};
