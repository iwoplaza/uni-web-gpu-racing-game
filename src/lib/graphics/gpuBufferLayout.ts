import { MaxValue, type Schema } from 'typed-binary';

export enum PrimitiveType {
	u32,
	i32,
	f32,
	vec2u,
	vec2i,
	vec2f,
	vec3u,
	vec3i,
	vec3f,
	vec4u,
	vec4i,
	vec4f,
	mat4f
}

const GRID_MASK = 0xf;
const INV_GRID_MASK = ~GRID_MASK;

export class MemoryLocation {
	constructor(
		private device: GPUDevice,
		private bufferLayout: GPUBufferLayout,
		public offset: number
	) {}

	queueWrite(
		data: SharedArrayBuffer | BufferSource,
		size: number,
		options?: {
			dataOffset?: number;
			bufferOffset?: number;
		}
	): void {
		if (!this.bufferLayout.buffer) {
			throw new Error(`Tried to write to uninitialized buffer layout`);
		}

		const { dataOffset = 0, bufferOffset = 0 } = options ?? {};

		this.device.queue.writeBuffer(
			this.bufferLayout.buffer,
			this.offset + bufferOffset,
			data,
			dataOffset,
			size
		);
	}
}

class GPUBufferLayout {
	private subLayout = false;
	private _buffer: GPUBuffer | undefined;
	private ownedLocations: MemoryLocation[] = [];
	private tailOffset: number = 0;

	constructor(
		private readonly device: GPUDevice,
		private readonly descriptor: Omit<GPUBufferDescriptor, 'size'>
	) {}

	destroy() {
		this._buffer?.destroy();
	}

	get buffer(): GPUBuffer {
		if (!this._buffer) {
			throw new Error(`Tried to access buffer of uninitialized buffer layout`);
		}
		return this._buffer;
	}

	alignToGrid(): void {
		// apply padding
		this.tailOffset = (this.tailOffset & INV_GRID_MASK) + GRID_MASK + 1;
	}

	allocateLayout(subLayout: GPUBufferLayout): void {
		if (this._buffer) {
			throw new Error(`Cannot allocate after finalizing.`);
		}

		subLayout.alignToGrid();
		subLayout.subLayout = true;

		this.alignToGrid();
		for (const loc of subLayout.ownedLocations) {
			loc.offset += this.tailOffset;
			this.ownedLocations.push(loc);
		}
		subLayout.ownedLocations = [];

		this.tailOffset += subLayout.tailOffset;
	}

	private _allocateSize(size: number): MemoryLocation {
		if (this._buffer) {
			throw new Error(`Cannot allocate after finalizing.`);
		}

		if (this.subLayout) {
			throw new Error(`Cannot allocate after transferring ownership`);
		}

		// Will this value cross the 16-byte boundary? (std140 layout)
		if (this.tailOffset >> 4 !== (this.tailOffset + size - 1) >> 4) {
			// apply padding
			this.alignToGrid();
		}

		const location = new MemoryLocation(this.device, this, this.tailOffset);
		this.ownedLocations.push(location);

		this.tailOffset += size;

		return location;
	}

	allocate(schema: Schema<unknown>): MemoryLocation {
		return this._allocateSize(schema.sizeOf(MaxValue));
	}

	finalize(minBufferSize: number = 0) {
		this.alignToGrid();
		const estimatedSize = this.tailOffset;

		this._buffer = this.device.createBuffer({
			...this.descriptor,
			size: Math.max(estimatedSize, minBufferSize)
		});
	}
}

export default GPUBufferLayout;
