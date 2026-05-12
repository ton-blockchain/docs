"use client"
import {useDraggable} from "@dnd-kit/core"
import {FileText} from "lucide-react"
import {useMemo, useState} from "react"

export function OrphansTray({
  orphans,
  titles,
  onAcknowledge,
  acknowledged,
}: {
  orphans: string[]
  titles: Record<string, string>
  onAcknowledge: (v: boolean) => void
  acknowledged: boolean
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    if (!query.trim()) return orphans
    const q = query.toLowerCase()
    return orphans.filter(
      s => s.toLowerCase().includes(q) || titles[s]?.toLowerCase().includes(q),
    )
  }, [query, orphans, titles])

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-fd-border bg-fd-card/30">
      <div className="border-b border-fd-border p-3">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">
          <span>Orphans</span>
          <span className="rounded bg-fd-muted/40 px-1.5 py-0.5 text-[10px]">{orphans.length}</span>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="filter..."
          className="mt-1 w-full rounded border border-fd-border bg-fd-background px-2 py-1 text-xs outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-fd-muted-foreground">
            All .mdx files are placed in the navigation.
          </div>
        )}
        {filtered.map(slug => (
          <OrphanRow key={slug} slug={slug} title={titles[slug]} />
        ))}
      </div>
      {orphans.length > 0 && (
        <label className="flex items-start gap-2 border-t border-fd-border p-3 text-xs text-fd-muted-foreground">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => onAcknowledge(e.target.checked)}
          />
          <span>
            I accept saving with {orphans.length} orphan{orphans.length === 1 ? "" : "s"}.
          </span>
        </label>
      )}
    </aside>
  )
}

function OrphanRow({slug, title}: {slug: string; title?: string}) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: `orphan:${slug}`,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined}}
      className={`flex cursor-grab items-center gap-2 px-3 py-1 text-xs hover:bg-fd-accent/40 ${
        isDragging ? "opacity-40" : ""
      }`}
      title={slug}
    >
      <FileText size={12} className="text-fd-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{title ?? slug.split("/").pop()}</span>
        <span className="truncate text-[10px] text-fd-muted-foreground">/{slug}</span>
      </div>
    </div>
  )
}
