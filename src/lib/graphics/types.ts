import type GPUBufferLayout from './gpuBufferLayout';

export interface GPUPresence {
	/**
	 * @returns The new offset
	 */
	bindToLayout(layout: GPUBufferLayout): void;

	queueWrite(): void;

	maxSize(): number;
}
