/**
 * Compatibility shim replacing `@tanstack/react-start`'s `useServerFn`.
 * Now that the app is a pure SPA, "server functions" are just plain
 * async client functions — this hook returns them unchanged so existing
 * `useServerFn(fn)` call sites keep working.
 */
export function useServerFn<T>(fn: T): T {
  return fn;
}
