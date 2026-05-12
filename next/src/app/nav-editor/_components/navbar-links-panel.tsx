"use client"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {CSS} from "@dnd-kit/utilities"
import {ChevronDown, ChevronRight, ExternalLink, GripVertical, Plus, Trash2} from "lucide-react"
import {useRef, useState} from "react"
import type {LinkRef, NavConfig} from "@/lib/nav-types"
import {
  addNavbarLink,
  moveNavbarLink,
  newLink,
  removeNavbarLink,
  updateNavbarLink,
} from "../_lib/tree-ops"
import {IconPicker} from "./icon-picker"
import {IconRender} from "./icon-render"

/**
 * Top-bar "Header navbar links" editor. These links live in
 * `config.navbarLinks` and are surfaced by `layout.shared.tsx` in the
 * Fumadocs nav header — they're independent of tabs and don't appear in
 * the in-sidebar tab strip.
 */
export function NavbarLinksPanel({
  config,
  onUpdate,
}: {
  config: NavConfig
  onUpdate: (next: NavConfig, newSelection?: number[] | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [picker, setPicker] = useState<{index: number; rect: DOMRect | null} | null>(null)
  const links = config.navbarLinks ?? []
  const ids = links.map((_, i) => `navbar-link:${i}`)

  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}))

  function handleDragEnd(e: DragEndEvent) {
    const {active, over} = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from === -1 || to === -1) return
    onUpdate(moveNavbarLink(config, from, to))
  }

  function handleAdd() {
    onUpdate(addNavbarLink(config, newLink("New link", "https://")))
    setExpanded(true)
  }

  return (
    <section className="border-b border-fd-border bg-fd-card/20">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-fd-muted-foreground hover:text-fd-foreground"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <ExternalLink size={12} />
          Header navbar links
          <span className="text-fd-muted-foreground/70 normal-case">({links.length})</span>
        </button>
        <button
          type="button"
          onClick={handleAdd}
          title="Append a new external link to the top header bar"
          className="flex items-center gap-1 rounded border border-fd-border bg-fd-background px-2 py-0.5 text-[11px] font-medium text-fd-foreground hover:bg-fd-accent"
        >
          <Plus size={12} />
          Add link
        </button>
      </div>
      {expanded && (
        <div className="px-1 pb-2">
          {links.length === 0 ? (
            <div className="px-4 py-3 text-xs text-fd-muted-foreground">
              No header links yet. Click <span className="font-medium">+ Add link</span> to add
              one — they appear in the top navigation bar across every page.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                  {links.map((link, index) => (
                    <NavbarLinkRow
                      key={ids[index]}
                      id={ids[index]}
                      link={link}
                      onNameChange={name =>
                        onUpdate(updateNavbarLink(config, index, {name}))
                      }
                      onUrlChange={url =>
                        onUpdate(updateNavbarLink(config, index, {url}))
                      }
                      onTagChange={tag =>
                        onUpdate(updateNavbarLink(config, index, {tag: tag || undefined}))
                      }
                      onIconClick={rect => setPicker({index, rect})}
                      onRemove={() => onUpdate(removeNavbarLink(config, index))}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
      {picker && (
        <IconPicker
          open
          anchorRect={picker.rect}
          onClose={() => setPicker(null)}
          onPick={name =>
            onUpdate(updateNavbarLink(config, picker.index, {icon: name || undefined}))
          }
        />
      )}
    </section>
  )
}

function NavbarLinkRow({
  id,
  link,
  onNameChange,
  onUrlChange,
  onTagChange,
  onIconClick,
  onRemove,
}: {
  id: string
  link: LinkRef
  onNameChange: (name: string) => void
  onUrlChange: (url: string) => void
  onTagChange: (tag: string) => void
  onIconClick: (rect: DOMRect | null) => void
  onRemove: () => void
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id})
  const iconButtonRef = useRef<HTMLButtonElement>(null)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-fd-accent/40"
    >
      <button
        type="button"
        aria-label="drag"
        className="touch-none cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} className="text-fd-muted-foreground" />
      </button>
      <button
        ref={iconButtonRef}
        type="button"
        aria-label={link.icon ? `icon: ${link.icon}` : "set icon"}
        title={link.icon ? `icon: ${link.icon}` : "click to set an icon"}
        onClick={e => {
          e.stopPropagation()
          onIconClick(iconButtonRef.current?.getBoundingClientRect() ?? null)
        }}
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-fd-accent"
      >
        {link.icon ? (
          <IconRender name={link.icon} size={14} />
        ) : (
          <ExternalLink size={14} className="text-fd-muted-foreground" />
        )}
      </button>
      <input
        value={link.name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Link name"
        aria-label="link name"
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-fd-border focus:bg-fd-background"
      />
      <input
        value={link.url}
        onChange={e => onUrlChange(e.target.value)}
        placeholder="https://"
        aria-label="link URL"
        spellCheck={false}
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs text-fd-muted-foreground outline-none focus:border-fd-border focus:bg-fd-background"
      />
      <input
        value={link.tag ?? ""}
        onChange={e => onTagChange(e.target.value)}
        placeholder="tag"
        aria-label="link tag"
        className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-fd-muted-foreground/60 focus:border-fd-border focus:bg-fd-background"
      />
      <button
        type="button"
        aria-label="remove link"
        title="Remove this header link"
        onClick={onRemove}
        className="opacity-0 transition-opacity hover:text-fd-destructive group-hover:opacity-100"
      >
        <Trash2 size={14} className="text-fd-muted-foreground hover:text-fd-destructive" />
      </button>
    </li>
  )
}
