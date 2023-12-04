import { BinaryEntity, type Entity } from '../common/systems/types';
import { BufferReader, BufferWriter } from 'typed-binary';

export function compress(value: Entity) {
  const size = BinaryEntity.measure(value as unknown  as BinaryEntity).size;
  const buffer = new ArrayBuffer(size);
  const writer = new BufferWriter(buffer);
  BinaryEntity.write(writer, value as unknown as BinaryEntity);
  console.log(buffer)
  return buffer;
}


export function decompress(buffer: Buffer| ArrayBuffer) {
  const reader = new BufferReader(buffer);
  return BinaryEntity.read(reader) as unknown as Entity;
}
