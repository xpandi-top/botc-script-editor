import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that updates after `delay` ms of no changes.
 * Useful for expensive derived computations (filtering, search) on text inputs.
 *
 * @example
 *   const [query, setQuery] = useState('')
 *   const debouncedQuery = useDebounce(query, 300)
 *   // use debouncedQuery for the expensive filter, query for the input value
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
