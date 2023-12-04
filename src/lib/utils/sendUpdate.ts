import { carGame } from '$lib/carGame';
import { jitter, lastSentTime, latency, maxBitrate, packetsLost, packetsSent } from '$lib/clientSocket';
import { wrapWithTimestamp } from '$lib/common/wrapWithTimestamp';
import { get } from 'svelte/store';

export async function sendUpdate(name: string, value: object) {
  const jit = get(jitter);
  const lat = get(latency);
  const delay = lat + Math.random() * jit;
  const currentTime = Date.now();
  const lost = get(packetsLost)
  const lastSent = get(lastSentTime);
  const max = get(maxBitrate);
  console.log(max)
  // Calculate the next allowed send time (1000ms after the last send)
  const nextSendTime = lastSent + 10000  / max;
  if (currentTime < nextSendTime) {
    packetsLost.set(lost + 1);
    return;
  }
  lastSentTime.set(Date.now());

  setTimeout(() => {
    // TODO data compresssion
    // carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(compress(value)));
    carGame?.clientSocket.socket.emit(name, wrapWithTimestamp(value));
  }, delay);
  const sent = get(packetsSent);
  packetsSent.set(sent + 1);

}
