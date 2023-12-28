class WGSLRuntime {
  private uniqueIds = new WeakMap<WGSLToken, string>();
  private lastUniqueId = 0;

  uniqueIdFor(token: WGSLToken) {
    let uniqueId = this.uniqueIds.get(token);

    if (uniqueId === undefined) {
      uniqueId = this.reserveUniqueId(token);
      this.uniqueIds.set(token, uniqueId);
    }

    return uniqueId;
  }

  private reserveUniqueId(token: WGSLToken): string {
    return `${token.prefix}_${this.lastUniqueId++}`;
  }

  private static _instance: WGSLRuntime | null = null;

  public static get instance() {
    if (!WGSLRuntime._instance) {
      WGSLRuntime._instance = new WGSLRuntime();
    }

    return WGSLRuntime._instance;
  }
}

const runtime = new WGSLRuntime();

export class WGSLToken {
  constructor(public readonly prefix: string) {}
}

export type WGSLParamValue = string | number;
class WGSLParam {
  constructor(public readonly description: string, public readonly defaultValue?: WGSLParamValue) {}
}

/**
 * Creates a constant is computed at shader initialization according
 * to the passed in expression.
 */
class WGSLConstant {
  public token: WGSLToken;
  public declaration: WGSLCode;

  constructor(expr: WGSLSegment, public readonly description: string) {
    this.token = new WGSLToken(description.replaceAll(/\s/g, '_'));
    this.declaration = code`const ${this.token} = ${expr};`;
  }
}

class WGSLFunction {
  private nameToken: WGSLToken;
  public declaration: WGSLCode;

  constructor(prefix: string, private readonly body: WGSLCode) {
    this.nameToken = new WGSLToken(prefix);

    this.declaration = code`fn ${this.nameToken}${this.body}`;
  }

  resolve(): string {
    return runtime.uniqueIdFor(this.nameToken);
  }
}

function addUnique<T>(list: T[], value: T) {
  if (list.includes(value)) {
    return;
  }

  list.push(value);
}

export class WGSLCode {
  constructor(
    public readonly segments: (WGSLCode | WGSLFunction | WGSLParam | WGSLToken | string)[]
  ) {}

  allDependencies() {
    const list: WGSLCode[] = [];

    for (const s of this.segments) {
      if (s instanceof WGSLCode) {
        for (const dep of s.allDependencies()) {
          addUnique(list, dep);
        }
      } else if (s instanceof WGSLConstant) {
        addUnique(list, s.declaration);
        for (const dep of s.declaration.allDependencies()) {
          addUnique(list, dep);
        }
      } else if (s instanceof WGSLFunction) {
        addUnique(list, s.declaration);
        for (const dep of s.declaration.allDependencies()) {
          addUnique(list, dep);
        }
      }
    }

    return list;
  }

  resolve(paramBindings: [WGSLParam, WGSLParamValue][], root = true) {
    let code = '';

    if (root) {
      const dependencies = this.allDependencies();

      code += dependencies
        .toReversed()
        .map((d) => d.resolve(paramBindings, false))
        .join('\n');
    }

    for (const s of this.segments) {
      switch (true) {
        case s instanceof WGSLCode:
          code += s.resolve(paramBindings, false);
          break;
        case s instanceof WGSLParam: {
          const [, value = s.defaultValue] = paramBindings.find(([param]) => param === s) ?? [];
          if (!value) {
            throw new Error(`Missing parameter binding for '${s.description}'`);
          }
          code += String(value);
          break;
        }
        case s instanceof WGSLFunction:
          code += s.resolve();
          break;
        case s instanceof WGSLConstant:
          code += runtime.uniqueIdFor(s.token);
          break;
        case s instanceof WGSLToken:
          code += runtime.uniqueIdFor(s);
          break;
        default:
          code += s;
      }
    }

    return code;
  }
}

export type WGSLSegment = string | WGSLToken | WGSLParam | WGSLConstant | WGSLCode | WGSLFunction;

export function code(
  strings: TemplateStringsArray,
  ...params: (WGSLSegment | WGSLSegment[])[]
): WGSLCode {
  const segments: WGSLSegment[] = [];
  for (let i = 0; i < strings.length; ++i) {
    segments.push(strings[i]);
    if (i < params.length) {
      const param = params[i];
      if (param instanceof Array) {
        segments.push(...param);
      } else {
        segments.push(param);
      }
    }
  }

  return new WGSLCode(segments);
}

function fn(prefix: string = 'function') {
  return (strings: TemplateStringsArray, ...params: WGSLSegment[]): WGSLFunction => {
    return new WGSLFunction(prefix, code(strings, ...params));
  };
}

// function require(code: WGSLCode): WGSLDependency {
//   return new WGSLDependency(code);
// }

function token(prefix: string): WGSLToken {
  return new WGSLToken(prefix);
}

function param(description: string, defaultValue?: WGSLParamValue): WGSLParam {
  return new WGSLParam(description, defaultValue);
}

function constant(expr: WGSLSegment, description?: string): WGSLConstant {
  return new WGSLConstant(expr, description ?? 'constant');
}

export default Object.assign(code, {
  code,
  fn,
  token,
  param,
  constant
  // require
});
