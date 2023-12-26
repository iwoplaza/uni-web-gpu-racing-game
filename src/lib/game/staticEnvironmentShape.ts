import { mat4 } from 'wgpu-matrix';

import type { Shape, ShapeData } from '$lib/graphics/sceneInfo';
import wgsl from '$lib/graphics/wgsl';
import { checkerboard, lambert } from '$lib/graphics/wgslMaterial';

class StaticEnvironmentShape implements Shape {
  kind = StaticEnvironmentShape;

  get data(): Readonly<ShapeData> {
    return {
      materialIdx: 0,
      extra1: 0,
      extra2: 0,
      transform: [...mat4.identity().values()]
    };
  }

  static shapeCode = wgsl`
  return pos.y;
  `;
  static materialCode = wgsl`
  ${lambert}(ctx, ${checkerboard}(pos.xz, 0.2) * vec3f(0.3, 0.6, 0.3), out);
  `;
}

export default StaticEnvironmentShape;
