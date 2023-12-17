import type { Middleware } from './pipeline';

export type Timestamped<T> = {
  timestamp: number;
  value: T;
};
export function wrapWithTimestamp<T>(value: T) {
  return {
    timestamp: Date.now(),
    value
  };
}

export const timestampMiddleware =
  <T>(): Middleware<T, Timestamped<T>> =>
  (value, next) => {
    next({ timestamp: Date.now(), value });
  };

export const extractTimestampMiddleware =
  <T>(): Middleware<Timestamped<T>, T> =>
  (value, next) => {
    next(value.value);
  };
