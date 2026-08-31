import '@testing-library/jest-dom'

/**
 * Node 26 defines a global `localStorage`/`sessionStorage` that resolves to
 * `undefined` unless the process is started with `--localstorage-file`. Those
 * globals shadow the ones jsdom installs, so every `localStorage.*` call in a
 * test throws "Cannot read properties of undefined".
 *
 * Install an in-memory Storage on any key that is missing or undefined. On
 * runtimes where jsdom's own Storage survives, this is a no-op.
 */
function createMemoryStorage(): Storage {
  let store = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return store.size
    },
    clear() {
      store = new Map()
    },
    getItem(key: string) {
      const value = store.get(String(key))
      return value === undefined ? null : value
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(String(key))
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value))
    },
  }

  return storage
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if ((globalThis as Record<string, unknown>)[name] != null) continue

  const storage = createMemoryStorage()

  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    writable: true,
  })

  // jsdom's `window` is the same object as `globalThis` here, but define it
  // explicitly so code reading `window.localStorage` works if that changes.
  if (typeof window !== 'undefined' && window !== (globalThis as unknown)) {
    Object.defineProperty(window, name, {
      value: storage,
      configurable: true,
      writable: true,
    })
  }
}
