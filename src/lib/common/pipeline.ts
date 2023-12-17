export type Middleware<In = unknown, Out = unknown> = (
  value: In,
  next: (value: Out) => void
) => void;

export type MiddlewareIn<M extends Middleware<unknown>> = Parameters<M>[0];
export type MiddlewareOut<M extends Middleware<unknown>> = Parameters<Parameters<M>[1]>[0];

const noOpMiddleware = <T>(value: T, next: (value: T) => void) => next(value);

export class Pipeline<In = unknown, Final = In> {
  constructor(private readonly middlewares: Middleware[] = []) {}

  use<Out>(middleware: Middleware<Final, Out>) {
    return new Pipeline<In, Out>([...this.middlewares, middleware as Middleware]);
  }

  _executeStep(idx: number, value: unknown, finalCallback: (value: Final) => void) {
    if (idx === this.middlewares.length) {
      finalCallback(value as Final);
      return;
    }

    this.middlewares[idx](value, (nextValue) =>
      this._executeStep(idx + 1, nextValue, finalCallback)
    );
  }

  finally(callback: (processedValue: Final) => void) {
    if (this.middlewares.length === 0) {
      this.middlewares.push(noOpMiddleware);
    }

    return (value: In) => {
      this._executeStep(0, value, callback);
    };
  }
}

export default function pipeline<T>() {
  return new Pipeline<T>();
}
