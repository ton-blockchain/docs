"use client"
import {useEffect, useMemo, useRef, useState} from "react"

export interface PaletteAction {
  id: string
  title: string
  hint?: string
  shortcut?: string
  onRun: () => void
}

export function CommandPalette(props: {open: boolean; onClose: () => void; actions: PaletteAction[]}) {
  if (!props.open) return null
  return <CommandPaletteInner onClose={props.onClose} actions={props.actions} />
}

function CommandPaletteInner({
  onClose,
  actions,
}: {
  onClose: () => void
  actions: PaletteAction[]
}) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase()
    return actions.filter(a => a.title.toLowerCase().includes(q))
  }, [query, actions])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setActive(a => Math.min(a + 1, Math.max(0, filtered.length - 1)))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActive(a => Math.max(0, a - 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const a = filtered[active]
        if (a) {
          a.onRun()
          onClose()
        }
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [filtered, active, onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-[12vh] w-[560px] overflow-hidden rounded-lg border border-fd-border bg-fd-popover shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setActive(0)
          }}
          placeholder="Type a command..."
          className="w-full border-b border-fd-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-fd-muted-foreground">No matches.</li>
          )}
          {filtered.map((a, i) => (
            <li
              key={a.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                a.onRun()
                onClose()
              }}
              className={`flex cursor-pointer items-baseline justify-between px-4 py-2 text-sm ${
                i === active ? "bg-fd-accent" : ""
              }`}
            >
              <div className="flex flex-col">
                <span>{a.title}</span>
                {a.hint && <span className="text-xs text-fd-muted-foreground">{a.hint}</span>}
              </div>
              {a.shortcut && (
                <code className="rounded bg-fd-muted/40 px-1.5 py-0.5 text-[10px]">{a.shortcut}</code>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
