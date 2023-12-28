import wgsl from '../graphics/wgsl';
import type { Shape, ShapeData } from '../graphics/sceneInfo';
import { op, sdf } from '../graphics/sdf';
import { lambert } from '../graphics/wgslMaterial';

export class RoadSegmentShape implements Shape {
  kind = RoadSegmentShape;

  /**
   * Used to apply proper patterns in the material
   */
  nextHint: RoadSegmentShape | null = null;

  constructor(private readonly anchorPoints: [number, number][]) {}

  get data(): Readonly<ShapeData> {
    return {
      materialIdx: 1,
      extra1: 0,
      extra2: 0,
      transform: [
        ...this.anchorPoints[0],
        ...(this.nextHint?.anchorPoints[0] ?? [0, 0]),
        ...this.anchorPoints[1],
        ...(this.nextHint?.anchorPoints[1] ?? [0, 0]),
        ...this.anchorPoints[2],
        ...(this.nextHint?.anchorPoints[2] ?? [0, 0]),
        ...this.anchorPoints[3],
        ...(this.nextHint?.anchorPoints[3] ?? [0, 0])
      ]
    };
  }

  static shapeCode = wgsl`
  let anchors = scene_shapes[shape_idx].transform;
  let A = anchors[0].xy - pos.xz;
  let B = anchors[1].xy - pos.xz;
  let C = anchors[2].xy - pos.xz;
  let D = anchors[3].xy - pos.xz;

  if (dot((*ctx).view_dir, vec3f(0, -1, 0)) < 0.04) {
    return FAR;
  }

  let d_bezier = ${sdf.cubicBezier2}(vec2f(0., 0.), A, B, C, D);

  return ${op.extrude}(d_bezier - 15., pos.y, 0.1);
  `;

  static materialCode = wgsl`
  let anchors = scene_shapes[shape_idx].transform;
  let d_curr_bezier = ${sdf.cubicBezier2}(pos.xz, anchors[0].xy, anchors[1].xy, anchors[2].xy, anchors[3].xy);
  let d_next_bezier = ${sdf.cubicBezier2}(pos.xz, anchors[0].zw, anchors[1].zw, anchors[2].zw, anchors[3].zw);
  let d_bezier = min(d_curr_bezier, d_next_bezier);

  let t = max(0., 0.4 - pow(abs(d_bezier - 12), 4));
  var albedo = mix(vec3f(0.4, 0.4, 0.4), vec3f(1., 1., 1.), t);

  ${lambert}(ctx, albedo, out);
  `;
}
