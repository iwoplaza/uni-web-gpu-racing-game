import { BufferWriter, MaxValue, type Parsed } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import type GBuffer from '../gBuffer';
import * as std140 from '../std140';
import fullScreenQuadWGSL from '../fullScreenQuad.wgsl?raw';
import postProcessWGSL from './postProcess.wgsl?raw';

type Options = {
	device: GPUDevice;
	context: GPUCanvasContext;
	presentationFormat: GPUTextureFormat;
	gBuffer: GBuffer;
};

type ViewportStruct = Parsed<typeof ViewportStruct>;
const ViewportStruct = std140.object({
	canvasSize: std140.vec2u
	// --
});
const ViewportStructSize = ViewportStruct.measure(MaxValue).size;

export const PostProcessingStep = ({ device, context, presentationFormat, gBuffer }: Options) => {
	//
	// SCENE
	//

	const viewport = {
		canvasSize: gBuffer.size
	};

	const viewportUniformBuffer = device.createBuffer({
		size: roundUp(ViewportStructSize, 16),
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});

	// Eagerly filling the buffer
	const viewportUniformData = new ArrayBuffer(ViewportStructSize);
	const bufferWriter = new BufferWriter(viewportUniformData);
	ViewportStruct.write(bufferWriter, viewport);

	device.queue.writeBuffer(
		viewportUniformBuffer, // dest
		0, // dest offset
		viewportUniformData, // src
		0, // src offset
		viewportUniformData.byteLength // size
	);

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
		perform(commandEncoder: GPUCommandEncoder) {
			// Updating color attachment
			const textureView = context.getCurrentTexture().createView();
			passColorAttachment.view = textureView;

			const pass = commandEncoder.beginRenderPass(passDescriptor);
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, bindGroup);
			pass.draw(6);
			pass.end();
		}
	};
};
