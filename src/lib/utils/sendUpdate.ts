import { carGame } from '$lib/carGame';
import { jitter, latency } from '$lib/clientSocket';
import { wrapWithTimestamp } from '$lib/common/wrapWithTimestamp';
import { get } from 'svelte/store';

export async function sendUpdate(name: string, value: object) {
  const jit = get(jitter);
  const lat = get(latency);
  const delay = lat + Math.random() * jit;
  setTimeout(() => {
    // console.log(`Sending ${name} update`);
    carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(value));
  }, delay);
}
