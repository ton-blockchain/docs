"use client"
import {useEffect, useMemo, useRef, useState} from "react"
import {ICON_NAMES} from "../_lib/icons-list"
import {IconRender} from "./icon-render"

const RECENT_KEY = "nav-editor:recent-icons"

function loadRecent(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

export function IconPicker(props: {
  open: boolean
  onClose: () => void
  onPick: (name: string | undefined) => void
  anchorRect: DOMRect | null
}) {
  if (!props.open) return null
  return (
    <IconPickerInner onClose={props.onClose} onPick={props.onPick} anchorRect={props.anchorRect} />
  )
}

function IconPickerInner({
  onClose,
  onPick,
  anchorRect,
}: {
  onClose: () => void
  onPick: (name: string | undefined) => void
  anchorRect: DOMRect | null
}) {
  const [query, setQuery] = useState("")
  const [recent, setRecent] = useState<string[]>(() => loadRecent())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const list = useMemo(() => {
    if (!query.trim()) return ICON_NAMES
    const q = query.toLowerCase()
    return ICON_NAMES.filter(name => name.includes(q))
  }, [query])

  const pick = (name: string | undefined) => {
    onPick(name)
    if (name) {
      const next = [name, ...recent.filter(n => n !== name)].slice(0, 12)
      setRecent(next)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
    }
    onClose()
  }

  const left = anchorRect ? Math.min(window.innerWidth - 360, anchorRect.left) : 100
  const top = anchorRect ? Math.min(window.innerHeight - 420, anchorRect.bottom + 6) : 100

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[340px] rounded-lg border border-fd-border bg-fd-popover p-2 shadow-xl"
        style={{left, top}}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search icons..."
          className="w-full rounded border border-fd-border bg-fd-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40"
        />
        <button
          type="button"
          onClick={() => pick(undefined)}
          className="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-fd-accent"
        >
          <span className="inline-block h-4 w-4 rounded-full bg-fd-muted/50" />
          <span>No icon</span>
        </button>
        {recent.length > 0 && !query.trim() && (
          <div className="mt-2">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-fd-muted-foreground">
              Recent
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {recent.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => pick(name)}
                  title={name}
                  className="flex h-7 w-7 items-center justify-center rounded hover:bg-fd-accent"
                >
                  <IconRender name={name} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-2 grid max-h-[280px] grid-cols-8 gap-1 overflow-y-auto p-1">
          {list.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => pick(name)}
              title={name}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-fd-accent"
            >
              <IconRender name={name} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
