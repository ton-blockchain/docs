"use client"
import {useCallback, useEffect, useRef, useState} from "react"

interface UndoState<T> {
  past: T[]
  present: T
  future: T[]
}

/**
 * Unlimited undo/redo state hook. Every call to `set` snapshots the previous
 * value onto a stack; `undo` pops it back, `redo` re-applies. Optional
 * `storageKey` enables localStorage autosave of the (present, past, future)
 * triple so refresh doesn't lose work.
 */
export function useUndoable<T>(initial: T, options: {storageKey?: string} = {}) {
  const [state, setState] = useState<UndoState<T>>(() => hydrate(initial, options.storageKey))

  // Persist on every change (debounced via microtask coalescing).
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!options.storageKey || typeof window === "undefined") return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(options.storageKey!, JSON.stringify(state))
      } catch {
        // localStorage may be full; ignore
      }
    }, 250)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [state, options.storageKey])

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState(s => {
      const computed = typeof next === "function" ? (next as (prev: T) => T)(s.present) : next
      if (computed === s.present) return s
      return {past: [...s.past, s.present], present: computed, future: []}
    })
  }, [])

  const undo = useCallback(() => {
    setState(s => {
      if (s.past.length === 0) return s
      const last = s.past[s.past.length - 1]
      return {past: s.past.slice(0, -1), present: last, future: [s.present, ...s.future]}
    })
  }, [])

  const redo = useCallback(() => {
    setState(s => {
      if (s.future.length === 0) return s
      const next = s.future[0]
      return {past: [...s.past, s.present], present: next, future: s.future.slice(1)}
    })
  }, [])

  /** Replace state without tracking undo history (used after save). */
  const reset = useCallback((next: T) => {
    setState({past: [], present: next, future: []})
  }, [])

  return {
    value: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}

function hydrate<T>(initial: T, storageKey?: string): UndoState<T> {
  if (typeof window === "undefined" || !storageKey) {
    return {past: [], present: initial, future: []}
  }
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as UndoState<T>
      if (parsed && "present" in parsed) return parsed
    }
  } catch {
    // ignore malformed localStorage
  }
  return {past: [], present: initial, future: []}
}
