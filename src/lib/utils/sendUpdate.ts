import { carGame } from '$lib/carGame';
import { jitter, latency } from '$lib/clientSocket';
import { wrapWithTimestamp } from '$lib/common/wrapWithTimestamp';
import { get } from 'svelte/store';

export async function sendUpdate(name: string, value: object) {
  const jit = get(jitter);
  const lat = get(latency);
  const delay = lat + Math.random() * jit;
  setTimeout(() => {
    // TODO data compresssion
    // carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(compress(value)));
    carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(value));
  }, delay);
}
