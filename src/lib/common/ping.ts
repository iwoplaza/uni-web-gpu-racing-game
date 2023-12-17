import { writable } from 'svelte/store';

import type { Middleware } from './pipeline';
import type { Timestamped } from './timestampMiddleware';

export const packetsSent = writable(0);
export const packetsReceived = writable(0);

export const ping = (() => {
  const { set, subscribe } = writable(0);

  return {
    subscribe,
    onNewTimestamp(timestamp: number) {
      set(Math.abs(Date.now() - timestamp));
    }
  };
})();

export const measurePingMiddleware = <T extends Timestamped<unknown>>() =>
  ((value: T, next: (value: T) => void) => {
    ping.onNewTimestamp(value.timestamp);
    packetsReceived.update((prev) => prev + 1);

    next(value);
  }) satisfies Middleware<T, T>;
