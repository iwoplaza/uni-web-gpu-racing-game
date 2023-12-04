import { carGame } from '$lib/carGame';
import { jitter, latency } from '$lib/clientSocket';
import type { Entity } from '$lib/common/systems';
import { wrapWithTimestamp } from '$lib/common/wrapWithTimestamp';
import { get } from 'svelte/store';
import { compress, decompress } from './compression';
import _ from 'lodash';

export async function sendUpdate(name: string, value: Entity) {
  const jit = get(jitter);
  const lat = get(latency);
  const delay = lat + Math.random() * jit;
  setTimeout(() => {
    // TODO data compresssion
    const compressed = compress(value);
    carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(compressed));
    // console.log({value})
    // console.log({compressed})
    // const decompressed = decompress(compressed);
    // console.log({decompressed})
    // console.log({equal:_.isEqual(value, decompressed)})
    // carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(value));
  }, delay);
}
