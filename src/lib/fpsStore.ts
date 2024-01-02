import { writable } from 'svelte/store';

const fpsStore = (() => {
  const { subscribe, set } = writable(0);

  const interval = 1000; // 1 second
  const times: number[] = [];

  if (typeof window !== 'undefined') {
    const refreshLoop = () => {
      window.requestAnimationFrame(() => {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - interval) {
          times.shift();
        }
        times.push(now);
        refreshLoop();
      });
    };

    refreshLoop();

    setInterval(() => {
      set(times.length);
    }, interval);
  }

  return {
    subscribe
  };
})();

export default fpsStore;
