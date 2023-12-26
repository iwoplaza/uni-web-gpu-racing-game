import type { WGSLSegment } from '../wgsl';
import wgsl from '../wgsl';

export const dd = (code: WGSLSegment) => wgsl`dot(${code}, ${code})`;
