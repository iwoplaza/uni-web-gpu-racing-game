import renderSDFWGSL from './renderSDF.wgsl?raw';
import { preprocessShaderCode } from './preprocessShaderCode';
import { WhiteNoiseBuffer } from './whiteNoiseBuffer';
import { TimeInfoBuffer } from './timeInfoBuffer';
import CameraSettings from './cameraSettings';
import type GBuffer from './gBuffer';
import SceneInfo from './sceneInfo';
import { SphereShape, SphereShapeCollection } from './sphereShape';
import { CarWheelShape, CarWheelShapeCollection } from './carWheelShape';
import { mat4, vec3 } from 'wgpu-matrix';

export const SDFRenderer = (device: GPUDevice, gBuffer: GBuffer) => {
	const LABEL = `SDF Renderer`;
	const blockDim = 8;
	const whiteNoiseBufferSize = 512 * 512;
	const mainPassSize = gBuffer.rawRender.size;

	const camera = new CameraSettings(device);
	const whiteNoiseBuffer = WhiteNoiseBuffer(device, whiteNoiseBufferSize, GPUBufferUsage.STORAGE);
	const timeInfoBuffer = TimeInfoBuffer(device, GPUBufferUsage.UNIFORM);

	const sceneInfo = new SceneInfo(device);
	const sphereShapes = new SphereShapeCollection(3, device, sceneInfo);
	const carWheelShapes = new CarWheelShapeCollection(5, device, sceneInfo);

	const mainBindGroupLayout = device.createBindGroupLayout({
		label: `${LABEL} - Main Bind Group Layout`,
		entries: [
			{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				storageTexture: {
					format: 'rgba8unorm'
				}
			}
		]
	});

	const sharedBindGroupLayout = device.createBindGroupLayout({
		label: `${LABEL} - Shared Bind Group Layout`,
		entries: [
			{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage'
				}
			},
			{
				binding: 1,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'uniform'
				}
			}
		]
	});

	const sceneBindGroupLayout = device.createBindGroupLayout({
		label: `${LABEL} - Scene Bind Group Layout`,
		entries: [
			// scene_info
			{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage'
				}
			},
			// view_matrix
			{
				binding: 1,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage'
				}
			},
			// scene_domains
			{
				binding: 2,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage'
				}
			},
			...sphereShapes.bindGroupLayout,
			...carWheelShapes.bindGroupLayout
		]
	});

	const sharedBindGroup = device.createBindGroup({
		label: `${LABEL} - Shared Bind Group`,
		layout: sharedBindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: {
					label: `${LABEL} - White Noise Buffer`,
					buffer: whiteNoiseBuffer
				}
			},
			{
				binding: 1,
				resource: {
					label: `${LABEL} - Time Info`,
					buffer: timeInfoBuffer.buffer
				}
			}
		]
	});

	// const centerSphere = new SphereShape({
	// 	xyzr: [1, 0, 1, 2],
	// 	materialIdx: 1
	// });
	// sphereShapes.uploadInstance(centerSphere);

	// const lightSphere = new SphereShape({
	// 	xyzr: [-1, 0, 1, 0.5],
	// 	materialIdx: 2
	// });
	// sphereShapes.uploadInstance(lightSphere);

	const wheel = new CarWheelShape({
		transform: [...mat4.translation(vec3.fromValues(0, 0, 0)).values()]
	});
	console.log(wheel.data);
	carWheelShapes.uploadInstance(wheel);

	// sceneInfo.allocateSphere({
	// 	xyzr: [0, 0.7, 1, 0.2],
	// 	materialIdx: 2
	// });

	const sceneBindGroup = device.createBindGroup({
		label: `${LABEL} - Scene Bind Group`,
		layout: sceneBindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: {
					buffer: sceneInfo.gpuSceneInfoBuffer
				}
			},
			{
				binding: 1,
				resource: {
					buffer: camera.gpuBuffer
				}
			},
			// scene_domains
			{
				binding: 2,
				resource: {
					buffer: sceneInfo.gpuDomainsBuffer
				}
			},
			...sphereShapes.bindGroup,
			...carWheelShapes.bindGroup
		]
	});

	const mainBindGroup = device.createBindGroup({
		label: `${LABEL} - Main Bind Group`,
		layout: mainBindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: gBuffer.rawRender.view
			}
		]
	});

	const mainPipeline = device.createComputePipeline({
		label: `${LABEL} - Main Pipeline`,
		layout: device.createPipelineLayout({
			bindGroupLayouts: [sharedBindGroupLayout, mainBindGroupLayout, sceneBindGroupLayout]
		}),
		compute: {
			module: device.createShaderModule({
				label: `${LABEL} - Main Shader`,
				code: preprocessShaderCode(renderSDFWGSL, {
					OUTPUT_FORMAT: 'rgba8unorm',
					WIDTH: `${mainPassSize[0]}`,
					HEIGHT: `${mainPassSize[1]}`,
					BLOCK_SIZE: `${blockDim}`,
					WHITE_NOISE_BUFFER_SIZE: `${whiteNoiseBufferSize}`
				})
			}),
			entryPoint: 'main_frag'
		}
	});

	return {
		perform(commandEncoder: GPUCommandEncoder) {
			timeInfoBuffer.update();
			camera.update();
			camera.queueWrite();

			const mainPass = commandEncoder.beginComputePass();

			mainPass.setPipeline(mainPipeline);
			mainPass.setBindGroup(0, sharedBindGroup);
			mainPass.setBindGroup(1, mainBindGroup);
			mainPass.setBindGroup(2, sceneBindGroup);
			mainPass.dispatchWorkgroups(
				Math.ceil(mainPassSize[0] / blockDim),
				Math.ceil(mainPassSize[1] / blockDim),
				1
			);

			mainPass.end();
		}
	};
};
