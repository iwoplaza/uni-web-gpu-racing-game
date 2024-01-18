import type GBuffer from '../gBuffer';
import type RendererContext from '../rendererCtx';
import fullScreenQuadWGSL from '../fullScreenQuad.wgsl?raw';
import postProcessWGSL from './postProcess.wgsl?raw';

type Options = {
  device: GPUDevice;
  presentationFormat: GPUTextureFormat;
  gBuffer: GBuffer;
};

export const PostProcessingStep = ({ device, presentationFormat, gBuffer }: Options) => {
  //
  // SCENE
  //

  const fullScreenQuadShader = device.createShaderModule({
    label: 'Full Screen Quad Shader',
    code: fullScreenQuadWGSL
  });

  const postProcessShader = device.createShaderModule({
    label: 'Post Process Shader',
    code: postProcessWGSL
  });

  const pipeline = device.createRenderPipeline({
    label: 'Post Processing Pipeline',
    layout: 'auto',
    vertex: {
      module: fullScreenQuadShader,
      entryPoint: 'main'
    },
    fragment: {
      module: postProcessShader,
      entryPoint: 'main',
      targets: [{ format: presentationFormat }]
    }
  });

  const passColorAttachment: GPURenderPassColorAttachment = {
    // view is acquired and set in render loop.
    view: undefined as unknown as GPUTextureView,

    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
    loadOp: 'clear',
    storeOp: 'store'
  };

  const passDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [passColorAttachment]
  };

  const bindGroup = device.createBindGroup({
    label: 'Post Processing - Bind Group',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: gBuffer.rawRender.view
      }
    ]
  });

  return {
    perform(ctx: RendererContext) {
      // Updating color attachment
      passColorAttachment.view = ctx.renderTargetView;

      const pass = ctx.commandEncoder.beginRenderPass(passDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
    }
  };
};
