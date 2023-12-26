import wgsl from '../graphics/wgsl';
import type { Shape, ShapeData } from '../graphics/sceneInfo';
import { op, sdf } from '../graphics/sdf';
import { lambert } from '../graphics/wgslMaterial';

export class RoadSegmentShape implements Shape {
  kind = RoadSegmentShape;

  constructor(private readonly anchorPoints: [number, number][]) {}

  get data(): Readonly<ShapeData> {
    return {
      materialIdx: 1,
      extra1: 0,
      extra2: 0,
      transform: [
        ...this.anchorPoints[0],
        0,
        0,
        ...this.anchorPoints[1],
        0,
        0,
        ...this.anchorPoints[2],
        0,
        0,
        ...this.anchorPoints[3],
        0,
        0
      ]
    };
  }

  static shapeCode = wgsl`
  let anchors = scene_shapes[shape_idx].transform;
  let A = anchors[0].xy;
  let B = anchors[1].xy;
  let C = anchors[2].xy;
  let D = anchors[3].xy;
  let d_bezier = ${sdf.cubicBezier2}(pos.xz, A, B, C, D);

  return ${op.extrude}(d_bezier - 15., pos.y, 0.1);
  `;

  static materialCode = wgsl`
  let anchors = scene_shapes[shape_idx].transform;
  let d_bezier = ${sdf.cubicBezier2}(pos.xz, anchors[0].xy, anchors[1].xy, anchors[2].xy, anchors[3].xy);

  let t = max(0., 0.4 - pow(abs(d_bezier - 12), 4));
  var albedo = mix(vec3f(0.4, 0.4, 0.4), vec3f(1., 1., 1.), t);

  ${lambert}(ctx, albedo, out);
  `;
}
