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
