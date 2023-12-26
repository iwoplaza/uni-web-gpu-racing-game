import wgsl from '../graphics/wgsl';
import type { Shape, ShapeData } from '../graphics/sceneInfo';
import { op, sdf } from '../graphics/sdf';

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

  let box2d = ${op.inflate}(
    ${sdf.box2}(pos.xz, vec2f(2, 3)),
    0.5
  );

  let d_bezier = ${sdf.cubicBezier2}(pos.xz, anchors[0].xy, anchors[1].xy, anchors[2].xy, anchors[3].xy);

  return ${op.extrude}(d_bezier - 15., pos.y, 0.1);
  `;
}
