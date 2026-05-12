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
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react"
import {useRef, useState} from "react"
import type {ExternalTab, InternalTab, NavConfig, Tab} from "@/lib/nav-types"
import {isExternalTab} from "@/lib/nav-types"
import {
  addExternalTab,
  moveTab,
  removeTab,
  updateAt,
} from "../_lib/tree-ops"
import {IconPicker} from "./icon-picker"
import {IconRender} from "./icon-render"

/**
 * Top-bar "Header navbar links" editor. Lists every entry in `config.tabs[]`
 * as a single ordered, drag-reorderable list:
 *
 *   - Internal tab rows expose their `title`/`icon`/`tag` for quick edits
 *     and link to the tab's row in the main tree (deletion + page edits
 *     stay in the main tree).
 *   - External tab rows are fully editable (name, url, tag, icon, delete).
 *
 * Reordering this list reorders `config.tabs[]`, which drives both the
 * docs tab strip and the home page navbar.
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
  const tabs = config.tabs ?? []
  const ids = tabs.map((tab, i) => `header-tab:${tab.id || i}`)

  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}))

  function handleDragEnd(e: DragEndEvent) {
    const {active, over} = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from === -1 || to === -1) return
    onUpdate(moveTab(config, from, to), [to])
  }

  function handleAdd() {
    onUpdate(addExternalTab(config, {name: "New link", url: "https://"}))
    setExpanded(true)
  }

  const externalCount = tabs.filter(isExternalTab).length

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
          <span className="text-fd-muted-foreground/70 normal-case">
            ({tabs.length} {tabs.length === 1 ? "item" : "items"}
            {externalCount > 0 && `, ${externalCount} external`})
          </span>
        </button>
        <button
          type="button"
          onClick={handleAdd}
          title="Append a new external link to the header navbar"
          className="flex items-center gap-1 rounded border border-fd-border bg-fd-background px-2 py-0.5 text-[11px] font-medium text-fd-foreground hover:bg-fd-accent"
        >
          <Plus size={12} />
          Add link
        </button>
      </div>
      {expanded && (
        <div className="px-1 pb-2">
          {tabs.length === 0 ? (
            <div className="px-4 py-3 text-xs text-fd-muted-foreground">
              No header items yet. Click <span className="font-medium">+ Add link</span> to
              add an external link, or create an internal tab in the tree below.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                  {tabs.map((tab, index) =>
                    isExternalTab(tab) ? (
                      <ExternalTabRow
                        key={ids[index]}
                        id={ids[index]}
                        tab={tab}
                        onTitleChange={title =>
                          onUpdate(updateAt<Tab>(config, [index], {title}))
                        }
                        onUrlChange={url =>
                          onUpdate(updateAt<Tab>(config, [index], {url}))
                        }
                        onTagChange={tag =>
                          onUpdate(
                            updateAt<Tab>(config, [index], {tag: tag || undefined}),
                          )
                        }
                        onIconClick={rect => setPicker({index, rect})}
                        onRemove={() => onUpdate(removeTab(config, index))}
                      />
                    ) : (
                      <InternalTabRow
                        key={ids[index]}
                        id={ids[index]}
                        tab={tab}
                        onTitleChange={title =>
                          onUpdate(updateAt<Tab>(config, [index], {title}))
                        }
                        onTagChange={tag =>
                          onUpdate(
                            updateAt<Tab>(config, [index], {tag: tag || undefined}),
                          )
                        }
                        onIconClick={rect => setPicker({index, rect})}
                      />
                    ),
                  )}
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
            onUpdate(
              updateAt<Tab>(config, [picker.index], {icon: name || undefined}),
            )
          }
        />
      )}
    </section>
  )
}

function rowStyle(transform: ReturnType<typeof useSortable>["transform"], transition: string | undefined, isDragging: boolean): React.CSSProperties {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"]
  listeners: ReturnType<typeof useSortable>["listeners"]
}) {
  return (
    <button
      type="button"
      aria-label="drag"
      className="touch-none cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} className="text-fd-muted-foreground" />
    </button>
  )
}

function ExternalTabRow({
  id,
  tab,
  onTitleChange,
  onUrlChange,
  onTagChange,
  onIconClick,
  onRemove,
}: {
  id: string
  tab: ExternalTab
  onTitleChange: (title: string) => void
  onUrlChange: (url: string) => void
  onTagChange: (tag: string) => void
  onIconClick: (rect: DOMRect | null) => void
  onRemove: () => void
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id})
  const iconButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <li
      ref={setNodeRef}
      style={rowStyle(transform, transition, isDragging)}
      className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-fd-accent/40"
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      <button
        ref={iconButtonRef}
        type="button"
        aria-label={tab.icon ? `icon: ${tab.icon}` : "set icon"}
        title={tab.icon ? `icon: ${tab.icon}` : "click to set an icon"}
        onClick={e => {
          e.stopPropagation()
          onIconClick(iconButtonRef.current?.getBoundingClientRect() ?? null)
        }}
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-fd-accent"
      >
        {tab.icon ? (
          <IconRender name={tab.icon} size={14} />
        ) : (
          <ExternalLink size={14} className="text-fd-muted-foreground" />
        )}
      </button>
      <input
        value={tab.title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Link name"
        aria-label="link name"
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-fd-border focus:bg-fd-background"
      />
      <input
        value={tab.url}
        onChange={e => onUrlChange(e.target.value)}
        placeholder="https://"
        aria-label="link URL"
        spellCheck={false}
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs text-fd-muted-foreground outline-none focus:border-fd-border focus:bg-fd-background"
      />
      <input
        value={tab.tag ?? ""}
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

/**
 * Internal-tab row in the header panel: shows the tab as a drag-reorderable
 * but mostly read-only entry. Title / icon / tag remain editable for quick
 * tweaks; page edits + deletion stay in the main tree.
 */
function InternalTabRow({
  id,
  tab,
  onTitleChange,
  onTagChange,
  onIconClick,
}: {
  id: string
  tab: InternalTab
  onTitleChange: (title: string) => void
  onTagChange: (tag: string) => void
  onIconClick: (rect: DOMRect | null) => void
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id})
  const iconButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <li
      ref={setNodeRef}
      style={rowStyle(transform, transition, isDragging)}
      className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-fd-accent/40"
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      <button
        ref={iconButtonRef}
        type="button"
        aria-label={tab.icon ? `icon: ${tab.icon}` : "set icon"}
        title={tab.icon ? `icon: ${tab.icon}` : "click to set an icon"}
        onClick={e => {
          e.stopPropagation()
          onIconClick(iconButtonRef.current?.getBoundingClientRect() ?? null)
        }}
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-fd-accent"
      >
        {tab.icon ? (
          <IconRender name={tab.icon} size={14} />
        ) : (
          <FileText size={14} className="text-fd-muted-foreground" />
        )}
      </button>
      <input
        value={tab.title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Tab title"
        aria-label="tab title"
        className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-fd-border focus:bg-fd-background"
      />
      <span
        className="min-w-0 flex-1 truncate rounded px-1 py-0.5 font-mono text-xs text-fd-muted-foreground/70"
        title={tab.slug ? `/${tab.slug}` : "/ (root)"}
      >
        {tab.slug ? `/${tab.slug}` : "/"}
      </span>
      <input
        value={tab.tag ?? ""}
        onChange={e => onTagChange(e.target.value)}
        placeholder="tag"
        aria-label="tab tag"
        className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-fd-muted-foreground/60 focus:border-fd-border focus:bg-fd-background"
      />
      <span
        title="Internal tab — edit pages and delete in the tree below"
        className="w-5 text-center text-xs text-fd-muted-foreground/50"
      >
        ·
      </span>
    </li>
  )
}
