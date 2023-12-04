import { BinaryEntity, type Entity } from '../common/systems/types';
import { BufferReader, BufferWriter } from 'typed-binary';
import { Buffer } from 'buffer';

export function compress(value: Entity) {
  const size = BinaryEntity.measure(value as BinaryEntity).size;
  const buffer = Buffer.alloc(size);
  const writer = new BufferWriter(buffer);
  BinaryEntity.write(writer, value as BinaryEntity);
  console.log(buffer)
  return buffer;
}
export function decompress(buffer: Buffer) {
  const reader = new BufferReader(buffer);
  return BinaryEntity.read(reader) as Entity;
}
