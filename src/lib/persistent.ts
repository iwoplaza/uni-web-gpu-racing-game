import { writable, type Updater, get } from 'svelte/store';

function getStorage() {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    return localStorage;
  }

  return undefined;
}

const persistent = <T extends string | null>(storeKey: string, defaultValue: T) => {
  const internal = writable<T>((getStorage()?.getItem(storeKey) as T | undefined) ?? defaultValue);

  return {
    subscribe: internal.subscribe,
    set(value: T) {
      if (value !== null) {
        getStorage()?.setItem(storeKey, value);
      } else {
        getStorage()?.removeItem(storeKey);
      }
      internal.set(value);
    },
    update(updater: Updater<T>) {
      internal.update(updater);
      const value = get(internal);
      if (value !== null) {
        getStorage()?.setItem(storeKey, value);
      } else {
        getStorage()?.removeItem(storeKey);
      }
    }
  };
};

export default persistent;
