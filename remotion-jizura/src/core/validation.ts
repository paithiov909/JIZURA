import {JizuraError} from './error.js';

export function fail(code: string, path: string, message: string): never {
  throw new JizuraError(code, path, message);
}
export function record(value: unknown, path: string, code = 'E_INPUT'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    return fail(code, path, 'Expected a plain object.');
  }
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: readonly string[], path: string, code = 'E_INPUT'): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) fail(code, path ? `${path}.${String(key)}` : String(key), 'Unknown key.');
  }
}
export function integer(value: unknown, path: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    return fail('E_NUMBER', path, `Expected a safe integer in ${min}..${max}.`);
  }
  return value;
}
export function finite(value: unknown, path: string, min: number, max = Infinity, code = 'E_NUMBER'): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail(code, path, 'Number outside the allowed range.');
  return value;
}
export const seed = (value: unknown, path: string) => integer(value, path, 0, 4294967295);

// Freeze newly owned data only: never freeze caller props, React elements or service caches.
export function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function color(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return fail('E_STYLE', path, 'Expected #RGB or #RRGGBB.');
  return (value.length === 4 ? '#' + [...value.slice(1)].map(c => c + c).join('') : value).toUpperCase();
}
