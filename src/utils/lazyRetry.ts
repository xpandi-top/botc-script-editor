import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Wraps a dynamic import() (as used with React.lazy) with retry+backoff,
 * then a one-time hard reload as a last resort.
 *
 * React.lazy caches the promise returned by its loader forever — once a
 * chunk fetch fails (transient network blip, or a stale chunk hash after
 * a redeploy invalidates the CDN-cached index.html), every future render
 * of that lazy component rethrows the same cached rejection, even after
 * the user clicks "Retry". Only a full page reload re-fetches index.html
 * and gets fresh chunk URLs. This wrapper retries the fetch itself first
 * (covers transient failures without ever showing an error), and falls
 * back to one silent reload (covers stale-chunk failures) before finally
 * giving up and letting the error surface to an ErrorBoundary.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleId: string,
  retries = 3,
  retryDelayMs = 400
): LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadKey = `botc-chunk-reload:${moduleId}`
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await factory()
        sessionStorage.removeItem(reloadKey)
        return result
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
        }
      }
    }

    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1')
      window.location.reload()
      return new Promise<{ default: T }>(() => {}) // page is reloading; never resolve
    }

    throw lastError
  })
}
