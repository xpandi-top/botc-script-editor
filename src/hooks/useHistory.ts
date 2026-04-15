import { useState, useCallback } from 'react'

const MAX_HISTORY = 20

type HistoryState<T> = {
  past: T[]
  present: T
}

/**
 * Tracks a value with undo support.
 *
 * `set`             — update without creating a checkpoint (e.g. live timer ticks)
 * `setWithUndo`     — update AND push current value onto the undo stack
 * `undo`            — revert to the previous checkpoint
 * `canUndo`         — whether any checkpoints exist
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
  })

  /** Silent update — does not create an undo checkpoint. */
  const set = useCallback((updater: T | ((curr: T) => T)) => {
    setState((s) => ({
      ...s,
      present: typeof updater === 'function'
        ? (updater as (c: T) => T)(s.present)
        : updater,
    }))
  }, [])

  /** Update and push the previous value onto the undo stack. */
  const setWithUndo = useCallback((updater: T | ((curr: T) => T)) => {
    setState((s) => {
      const next = typeof updater === 'function'
        ? (updater as (c: T) => T)(s.present)
        : updater
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), s.present],
        present: next,
      }
    })
  }, [])

  /** Revert to the most recent checkpoint. */
  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s
      return {
        past: s.past.slice(0, -1),
        present: s.past[s.past.length - 1],
      }
    })
  }, [])

  return {
    value: state.present,
    set,
    setWithUndo,
    undo,
    canUndo: state.past.length > 0,
  }
}
