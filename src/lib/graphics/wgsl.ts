import { MaxValue, BufferWriter } from 'typed-binary';

import { roundUp } from '$lib/mathUtils';
import type { AlignedSchema } from './std140';

export class NameRegistry {
  private lastUniqueId = 0;
  private names = new WeakMap<WGSLToken, string>();

  nameFor(token: WGSLToken) {
    let name = this.names.get(token);
    if (name === undefined) {
      name = `${token.sanitizedName}_${this.lastUniqueId++}`;
      this.names.set(token, name);
    }

    return name;
  }
}

export class WGSLMemoryBlock {
  public size = 0;
  public entries: WGSLMemory<unknown>[] = [];
  public variableName: WGSLToken;
  private locationsMap = new WeakMap<WGSLMemory<unknown>, number>();

  constructor(
    private readonly name: string,
    public readonly usage: number,
    public readonly bufferBindingType: GPUBufferBindingType
  ) {
    this.variableName = new WGSLToken(name);
  }

  definitionCode(bindingGroup: number, bindingIdx: number) {
    const storageTypeToken = new WGSLToken(`${this.name}_type`);
    const fieldDefinitions = this.entries.map((e) => code`${e.nameToken}: ${e.typeExpr},\n`);

    if (fieldDefinitions.length === 0) {
      return undefined;
    }

    let bindingType = 'storage, read';

    if (this.bufferBindingType === 'uniform') {
      bindingType = 'uniform';
    }

    if (this.bufferBindingType === 'storage') {
      bindingType = 'storage, read_write';
    }

    return code`
    struct ${storageTypeToken} {
      ${fieldDefinitions}
    }
  
    @group(${bindingGroup}) @binding(${bindingIdx}) var<${bindingType}> ${this.variableName}: ${storageTypeToken};
    `;
  }

  allocate<T>(description: string, typeExpr: WGSLSegment, typeSchema: AlignedSchema<T>) {
    const memoryEntry = new WGSLMemory(this, description, typeExpr, typeSchema);

    this.entries.push(memoryEntry);
    // aligning
    this.size = roundUp(this.size, memoryEntry.baseAlignment);
    this.locationsMap.set(memoryEntry, this.size);
    this.size += memoryEntry.size;

    return memoryEntry;
  }

  locationFor(memoryEntry: WGSLMemory<unknown>) {
    return this.locationsMap.get(memoryEntry);
  }
}

export class MemoryRegistry {
  private memoryBlockBuffers = new WeakMap<WGSLMemoryBlock, GPUBuffer>();

  constructor() {}

  bufferFor(device: GPUDevice, block: WGSLMemoryBlock) {
    let buffer = this.memoryBlockBuffers.get(block);
    if (!buffer) {
      buffer = device.createBuffer({
        usage: block.usage,
        size: roundUp(block.size, 16)
      });

      this.memoryBlockBuffers.set(block, buffer);
    }

    return buffer;
  }
}

export class WGSLRuntime {
  public readonly names = new NameRegistry();
  public readonly memory = new MemoryRegistry();

  constructor(public readonly device: GPUDevice) {}

  dispose() {
    // TODO: Clean up all buffers
  }

  nameFor(token: WGSLToken) {
    return this.names.nameFor(token);
  }

  bufferFor(block: WGSLMemoryBlock) {
    return this.memory.bufferFor(this.device, block);
  }
}

export interface IResolutionCtx {
  readonly paramBindings: [WGSLParam, WGSLParamValue][];
  readonly placeholderBindings: [WGSLPlaceholder, WGSLSegment][];

  addDependency(item: WGSLItem): void;
  addMemory(storage: WGSLMemory<unknown>): void;
  nameFor(token: WGSLToken): string;
  resolve(item: WGSLSegment): string;
}

export class ResolutionCtx implements IResolutionCtx {
  public dependencies: WGSLItem[] = [];
  public usedMemoryBlocks = new Set<WGSLMemoryBlock>();
  public memoryBlockDeclarationIdxMap = new WeakMap<WGSLMemoryBlock, number>();

  private memoizedResults = new WeakMap<WGSLItem, string>();

  constructor(
    public readonly runtime: WGSLRuntime,
    public readonly paramBindings: [WGSLParam, WGSLParamValue][],
    public readonly placeholderBindings: [WGSLPlaceholder, WGSLSegment][]
  ) {}

  addDependency(item: WGSLItem) {
    this.resolve(item);
    addUnique(this.dependencies, item);
  }

  addMemory(memoryEntry: WGSLMemory<unknown>): void {
    this.usedMemoryBlocks.add(memoryEntry.block);
    this.memoryBlockDeclarationIdxMap.set(memoryEntry.block, this.dependencies.length);
  }

  nameFor(token: WGSLToken): string {
    return this.runtime.names.nameFor(token);
  }

  resolve(item: WGSLSegment) {
    if (typeof item === 'string') {
      return item;
    }

    if (typeof item === 'number') {
      return String(item);
    }

    const memoizedResult = this.memoizedResults.get(item);
    if (memoizedResult !== undefined) {
      return memoizedResult;
    }

    const result = item.resolve(this);
    this.memoizedResults.set(item, result);
    return result;
  }
}

abstract class WGSLItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getChildren(ctx: IResolutionCtx): WGSLItem[] {
    return [];
  }

  abstract resolve(ctx: IResolutionCtx): string;
}

export class WGSLToken extends WGSLItem {
  constructor(public readonly description: string) {
    super();
  }

  get sanitizedName() {
    return this.description.replaceAll(/\s/g, '_');
  }

  resolve(ctx: IResolutionCtx): string {
    return ctx.nameFor(this);
  }
}

export type WGSLParamValue = string | number;
class WGSLParam extends WGSLItem {
  constructor(public readonly description: string, public readonly defaultValue?: WGSLParamValue) {
    super();
  }

  resolve(ctx: IResolutionCtx): string {
    const [, value = this.defaultValue] = ctx.paramBindings.find(([param]) => param === this) ?? [];
    if (!value) {
      throw new Error(`Missing parameter binding for '${this.description}'`);
    }
    return String(value);
  }
}

/**
 * Creates a constant is computed at shader initialization according
 * to the passed in expression.
 */
class WGSLConstant extends WGSLItem {
  public token: WGSLToken;

  constructor(private readonly expr: WGSLSegment, public readonly description: string) {
    super();
    this.token = new WGSLToken(description.replaceAll(/\s/g, '_'));
  }

  resolve(ctx: ResolutionCtx): string {
    ctx.addDependency(code`const ${this.token} = ${this.expr};`);

    return ctx.resolve(this.token);
  }
}

class WGSLMemory<T> extends WGSLItem {
  public nameToken: WGSLToken;
  public size: number;
  public baseAlignment: number;

  constructor(
    public readonly block: WGSLMemoryBlock,
    description: string,
    public readonly typeExpr: WGSLSegment,
    private readonly typeSchema: AlignedSchema<T>
  ) {
    super();

    this.nameToken = new WGSLToken(description);
    this.size = this.typeSchema.measure(MaxValue).size;
    this.baseAlignment = this.typeSchema.baseAlignment;
  }

  write(runtime: WGSLRuntime, data: T) {
    const gpuBuffer = runtime.bufferFor(this.block);

    if (!gpuBuffer) {
      console.warn(`Cannot write to the read-only storage buffer. Nothing is used in code.`);
      return;
    }

    const bufferOffset = this.block.locationFor(this);

    if (bufferOffset === undefined) {
      console.warn(`Cannot write to a storage entry that is unused in code.`);
      return;
    }

    const hostBuffer = new ArrayBuffer(this.size);
    this.typeSchema.write(new BufferWriter(hostBuffer), data);
    runtime.device.queue.writeBuffer(gpuBuffer, bufferOffset, hostBuffer, 0, this.size);
  }

  resolve(ctx: IResolutionCtx): string {
    ctx.addMemory(this);
    ctx.resolve(this.typeExpr); // Adding dependencies of this entry

    return ctx.resolve(this.block.variableName) + '.' + ctx.resolve(this.nameToken);
  }
}

class WGSLFunction extends WGSLItem {
  private nameToken: WGSLToken;

  constructor(prefix: string, private readonly body: WGSLCode) {
    super();

    this.nameToken = new WGSLToken(prefix);
  }

  resolve(ctx: ResolutionCtx): string {
    ctx.addDependency(code`fn ${this.nameToken}${this.body}`);

    return ctx.resolve(this.nameToken);
  }
}

function addUnique<T>(list: T[], value: T) {
  if (list.includes(value)) {
    return;
  }

  list.push(value);
}

export class WGSLCode extends WGSLItem {
  constructor(public readonly segments: WGSLSegment[]) {
    super();
  }

  getChildren(): WGSLItem[] {
    return this.segments.filter((s): s is WGSLItem => typeof s !== 'string');
  }

  resolve(ctx: ResolutionCtx) {
    let code = '';

    for (const s of this.segments) {
      switch (true) {
        case s instanceof WGSLItem:
          code += ctx.resolve(s);
          break;
        default:
          code += String(s);
      }
    }

    return code;
  }
}

export class WGSLPlaceholder extends WGSLItem {
  constructor(public description: string, public defaultSegment?: WGSLSegment) {
    super();
  }

  private getSegment(ctx: IResolutionCtx) {
    const [, segment = this.defaultSegment] =
      ctx.placeholderBindings.find(([placeholder]) => placeholder === this) ?? [];

    if (!segment) {
      throw new Error(`Missing placeholder binding for '${this.description}'`);
    }

    return segment;
  }

  getChildren(ctx: IResolutionCtx): WGSLItem[] {
    const segment = this.getSegment(ctx);

    if (segment instanceof WGSLItem) {
      return segment.getChildren(ctx);
    }

    return [];
  }

  resolve(ctx: IResolutionCtx): string {
    return ctx.resolve(this.getSegment(ctx));
  }
}

export type WGSLSegment = string | number | WGSLItem;

export function resolveProgram(
  runtime: WGSLRuntime,
  root: WGSLItem,
  options: {
    shaderStage: number;
    bindingGroup: number;
    params?: [WGSLParam, WGSLParamValue][];
    placeholders?: [WGSLPlaceholder, WGSLSegment][];
  }
) {
  const ctx = new ResolutionCtx(runtime, options.params ?? [], options.placeholders ?? []);

  const codeString = ctx.resolve(root); // Resolving

  const usedBlocks = [...ctx.usedMemoryBlocks.values()];

  const bindGroupLayout = runtime.device.createBindGroupLayout({
    entries: usedBlocks.map((block, idx) => ({
      binding: idx,
      visibility: options.shaderStage,
      buffer: {
        type: block.bufferBindingType
      }
    }))
  });

  const bindGroup = runtime.device.createBindGroup({
    layout: bindGroupLayout,
    entries: usedBlocks.map((block, idx) => ({
      binding: idx,
      resource: {
        buffer: runtime.bufferFor(block)!
      }
    }))
  });

  const dependencies = ctx.dependencies.slice();

  usedBlocks.forEach((block, idx) => {
    const definitionCode = block.definitionCode(options.bindingGroup, idx);

    if (!definitionCode) {
      return;
    }

    dependencies.splice(ctx.memoryBlockDeclarationIdxMap.get(block) ?? 0, 0, definitionCode);
  });

  return {
    bindGroupLayout,
    bindGroup,
    code: dependencies.map((d) => ctx.resolve(d)).join('\n') + '\n' + codeString
  };
}

export function code(
  strings: TemplateStringsArray,
  ...params: (WGSLSegment | WGSLSegment[])[]
): WGSLCode {
  const segments: WGSLSegment[] = [];
  for (let i = 0; i < strings.length; ++i) {
    segments.push(strings[i]);
    if (i < params.length) {
      const param = params[i];
      if (param instanceof Array) {
        segments.push(...param);
      } else {
        segments.push(param);
      }
    }
  }

  return new WGSLCode(segments);
}

function fn(prefix: string = 'function') {
  return (strings: TemplateStringsArray, ...params: WGSLSegment[]): WGSLFunction => {
    return new WGSLFunction(prefix, code(strings, ...params));
  };
}

// function require(code: WGSLCode): WGSLDependency {
//   return new WGSLDependency(code);
// }

function token(prefix: string): WGSLToken {
  return new WGSLToken(prefix);
}

function param(description: string, defaultValue?: WGSLParamValue): WGSLParam {
  return new WGSLParam(description, defaultValue);
}

function placeholder(description: string, defaultSegment?: WGSLSegment): WGSLPlaceholder {
  return new WGSLPlaceholder(description, defaultSegment);
}

function constant(expr: WGSLSegment, description?: string): WGSLConstant {
  return new WGSLConstant(expr, description ?? 'constant');
}

export const READONLY_STORAGE = new WGSLMemoryBlock(
  'readonly_storage',
  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  'read-only-storage'
);

export const UNIFORM = new WGSLMemoryBlock(
  'uniforms',
  GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  'uniform'
);

export default Object.assign(code, {
  code,
  fn,
  token,
  param,
  placeholder,
  constant,
  READONLY_STORAGE,
  UNIFORM
  // require
});
