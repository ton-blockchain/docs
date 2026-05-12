"use client"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {SortableContext, useSortable, verticalListSortingStrategy} from "@dnd-kit/sortable"
import {CSS} from "@dnd-kit/utilities"
import {
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderInput,
  GripVertical,
  Layers,
  Link2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type {
  ExternalTab,
  GroupRef,
  InternalTab,
  LinkRef,
  NavConfig,
  NavEntry,
  PageRef,
  Tab,
} from "@/lib/nav-types"
import {
  isExternalTab,
  isGroup,
  isInternalTab,
  isLink,
  isPage,
  resolveGroupMode,
} from "@/lib/nav-types"
import {
  type FlatNode,
  type Path,
  collectTabSlugs,
  convertLinkToPage,
  convertTabToExternal,
  convertTabToInternal,
  demoteTabToGroup,
  flattenTree,
  getAt,
  insertAt,
  moveTo,
  newLink,
  newTab,
  pageCanonicalUrl,
  pageIconPatch,
  pathKey,
  pathParent,
  pathsEqual,
  pathStartsWith,
  promoteToTab,
  removeAt,
  resolvePageIcon,
  updateAt,
} from "../_lib/tree-ops"
import {IconPicker} from "./icon-picker"
import {IconRender} from "./icon-render"

const INDENT_PX = 18

interface PickerState {
  path: Path
  rect: DOMRect | null
}

interface MenuState {
  path: Path
  rect: DOMRect | null
}

interface DragCtxValue {
  overTarget: {containerPath: Path; index: number} | null
  setFlat: (flat: FlatNode[]) => void
}

const DragCtx = createContext<DragCtxValue>({
  overTarget: null,
  setFlat: () => {},
})

/**
 * Provider that wraps both the orphans tray and the tree view so cross-panel
 * drags work. The tree view itself rides inside this provider via `TreeView`.
 */
export function TreeDndProvider({
  config,
  onUpdate,
  onOrphanDrop,
  children,
  expanded,
  onToggleExpand,
  titles,
}: {
  config: NavConfig
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onOrphanDrop: (id: string, containerPath: Path, index: number) => void
  children: ReactNode
  expanded: Set<string>
  onToggleExpand: (key: string) => void
  titles: Record<string, string>
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overTarget, setOverTarget] = useState<{containerPath: Path; index: number} | null>(null)
  const [hoverExpandKey, setHoverExpandKey] = useState<string | null>(null)
  const [flat, setFlat] = useState<FlatNode[]>([])

  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}))

  // Auto-expand a closed expandable row after the cursor lingers over it.
  useEffect(() => {
    if (!hoverExpandKey || !activeId) return
    if (expanded.has(hoverExpandKey)) return
    const id = setTimeout(() => onToggleExpand(hoverExpandKey), 500)
    return () => clearTimeout(id)
  }, [hoverExpandKey, activeId, expanded, onToggleExpand])

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }

  const onDragMove = (e: DragMoveEvent) => {
    if (!e.over) {
      setOverTarget(null)
      setHoverExpandKey(null)
      return
    }
    const overId = String(e.over.id)
    const overNode = flat.find(n => pathKey(n.path) === overId)
    if (!overNode) {
      setOverTarget(null)
      return
    }
    const rect = e.over.rect
    const cursorY = (e.activatorEvent as PointerEvent).clientY + (e.delta.y ?? 0)
    const upperThird = cursorY < rect.top + rect.height / 3
    const lowerThird = cursorY > rect.top + (2 * rect.height) / 3
    const middle = !upperThird && !lowerThird
    const overParent = overNode.parentPath
    const overIndex = overNode.path[overNode.path.length - 1]
    // External tabs are leaves — they can never be a drop-inside target.
    const isExpandable =
      (overNode.path.length === 1 && isInternalTab(overNode.entry as Tab)) ||
      isGroup(overNode.entry as NavEntry)

    if (middle && isExpandable) {
      setHoverExpandKey(pathKey(overNode.path))
      const childrenArr =
        overNode.path.length === 1
          ? (overNode.entry as InternalTab).pages
          : (overNode.entry as GroupRef).pages
      setOverTarget({containerPath: overNode.path, index: childrenArr?.length ?? 0})
      return
    }
    setHoverExpandKey(null)
    setOverTarget({
      containerPath: overParent,
      index: upperThird ? overIndex : overIndex + 1,
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    setHoverExpandKey(null)
    const target = overTarget
    setOverTarget(null)
    if (!target) return
    const activeIdStr = String(e.active.id)
    if (activeIdStr.startsWith("orphan:")) {
      onOrphanDrop(activeIdStr.slice("orphan:".length), target.containerPath, target.index)
      return
    }
    const fromNode = flat.find(n => pathKey(n.path) === activeIdStr)
    if (!fromNode) return
    if (pathStartsWith(target.containerPath, fromNode.path)) return
    const {config: nextConfig, newPath} = moveTo(config, fromNode.path, target.containerPath, target.index)
    if (nextConfig === config) return
    onUpdate(nextConfig, newPath)
  }

  const ctxValue = useMemo<DragCtxValue>(() => ({overTarget, setFlat}), [overTarget])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setOverTarget(null)
        setHoverExpandKey(null)
      }}
    >
      <DragCtx.Provider value={ctxValue}>{children}</DragCtx.Provider>
      <DragOverlay>
        {activeId ? <DragOverlayContent id={activeId} flat={flat} titles={titles} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function DragOverlayContent({
  id,
  flat,
  titles,
}: {
  id: string
  flat: FlatNode[]
  titles: Record<string, string>
}) {
  if (id.startsWith("orphan:")) {
    return (
      <DragGhostLabel
        icon={<FileText size={14} className="text-fd-muted-foreground" />}
        label={id.slice("orphan:".length)}
      />
    )
  }
  const node = flat.find(n => pathKey(n.path) === id)
  if (!node) return null
  return <DragGhostNode node={node} titles={titles} />
}

export function TreeView({
  config,
  expanded,
  onToggleExpand,
  selected,
  onSelect,
  onUpdate,
  titles,
  icons,
  allSlugs,
}: {
  config: NavConfig
  expanded: Set<string>
  onToggleExpand: (key: string) => void
  selected: Path | null
  onSelect: (path: Path | null) => void
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  titles: Record<string, string>
  icons: Record<string, string>
  allSlugs: string[]
}) {
  const flat = useMemo(() => flattenTree(config, expanded), [config, expanded])
  const {overTarget, setFlat} = useContext(DragCtx)

  useEffect(() => {
    setFlat(flat)
  }, [flat, setFlat])

  const [picker, setPicker] = useState<PickerState | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  function addNewTab() {
    const tab = newTab("New tab", undefined, collectTabSlugs(config))
    const insertIndex = config.tabs.length
    onUpdate(insertAt(config, [], insertIndex, tab), [insertIndex])
  }

  return (
    <SortableContext items={flat.map(n => pathKey(n.path))} strategy={verticalListSortingStrategy}>
      <div className="flex items-center justify-between border-b border-fd-border px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-fd-muted-foreground">
          <Layers size={12} />
          Tabs &amp; sections
        </div>
        <button
          type="button"
          onClick={addNewTab}
          title="Add a new top-level tab"
          className="flex items-center gap-1 rounded border border-fd-border bg-fd-background px-2 py-0.5 text-[11px] font-medium text-fd-foreground hover:bg-fd-accent"
        >
          <Plus size={12} />
          New tab
        </button>
      </div>
      <div className="flex flex-col py-1">
        {flat.map(node => (
          <Row
            key={pathKey(node.path)}
            node={node}
            selected={selected ? pathsEqual(selected, node.path) : false}
            config={config}
            expanded={expanded.has(pathKey(node.path))}
            onToggleExpand={() => onToggleExpand(pathKey(node.path))}
            onSelect={() => onSelect(node.path)}
            onUpdate={onUpdate}
            titles={titles}
            icons={icons}
            showInsertBarBefore={
              overTarget?.containerPath &&
              pathsEqual(overTarget.containerPath, node.parentPath) &&
              overTarget.index === node.path[node.path.length - 1]
                ? true
                : false
            }
            showInsertBarAfter={
              overTarget?.containerPath &&
              pathsEqual(overTarget.containerPath, node.parentPath) &&
              overTarget.index === node.path[node.path.length - 1] + 1
                ? true
                : false
            }
            showDropInside={
              overTarget?.containerPath && pathsEqual(overTarget.containerPath, node.path)
                ? true
                : false
            }
            onIconClick={(path, rect) => setPicker({path, rect})}
            onMenuClick={(path, rect) => setMenu({path, rect})}
          />
        ))}
        {flat.length === 0 && (
          <div className="px-4 py-8 text-sm text-fd-muted-foreground">
            No entries yet — click <span className="font-medium">+ New tab</span> above, or open the
            command palette ({metaKey()}-K).
          </div>
        )}
      </div>

      {picker && (
        <IconPicker
          open
          onClose={() => setPicker(null)}
          anchorRect={picker.rect}
          onPick={name => {
            // Page rows route through `pageIconPatch` so clearing a page
            // whose frontmatter carries an icon emits the explicit-clear
            // sentinel (`icon: ""`) — apply-nav reads that as "strip the
            // icon line from the .mdx". Tabs/groups/links have no
            // frontmatter, so undefined alone is enough.
            const target = getAt(config, picker.path)
            if (target && picker.path.length > 1 && isPage(target as NavEntry)) {
              const patch = pageIconPatch(target as PageRef, icons, name)
              onUpdate(updateAt<PageRef>(config, picker.path, patch), picker.path)
            } else {
              onUpdate(
                updateAt<NavEntry & Tab>(config, picker.path, {icon: name ?? undefined}),
                picker.path,
              )
            }
          }}
        />
      )}
      {menu && (
        <RowMenu
          state={menu}
          config={config}
          onClose={() => setMenu(null)}
          onUpdate={onUpdate}
          allSlugs={allSlugs}
          titles={titles}
        />
      )}
    </SortableContext>
  )
}

function metaKey() {
  if (typeof navigator === "undefined") return "Ctrl"
  return navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"
}

function Row({
  node,
  selected,
  config,
  expanded,
  onToggleExpand,
  onSelect,
  onUpdate,
  titles,
  icons,
  showInsertBarBefore,
  showInsertBarAfter,
  showDropInside,
  onIconClick,
  onMenuClick,
}: {
  node: FlatNode
  selected: boolean
  config: NavConfig
  expanded: boolean
  onToggleExpand: () => void
  onSelect: () => void
  onUpdate: (next: NavConfig, newSelection?: Path | null) => void
  titles: Record<string, string>
  icons: Record<string, string>
  showInsertBarBefore: boolean
  showInsertBarAfter: boolean
  showDropInside: boolean
  onIconClick: (path: Path, rect: DOMRect | null) => void
  onMenuClick: (path: Path, rect: DOMRect | null) => void
}) {
  function openContextMenu(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Use the click coordinates so the menu appears under the cursor rather
    // than glued to the row's right edge.
    const pseudoRect = {
      ...rect,
      left: e.clientX,
      top: e.clientY,
      right: e.clientX,
      bottom: e.clientY,
    } as DOMRect
    onMenuClick(node.path, pseudoRect)
  }
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: pathKey(node.path),
  })

  const entry = node.entry
  const isTabRow = node.path.length === 1
  const isExternalTabRow = isTabRow && isExternalTab(entry as Tab)
  // External tabs hold no children — they're rendered as leaf rows.
  const isExpandable =
    !isExternalTabRow && (isTabRow || isGroup(entry as NavEntry))
  const indent = node.depth * INDENT_PX + 8

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  let iconNode: React.ReactNode = null
  let iconName: string | undefined
  let labelNode: React.ReactNode = null
  let canonicalUrl = ""
  const isLinkRow = !isTabRow && isLink(entry as NavEntry)
  const isGroupRow = !isTabRow && !isLinkRow && isGroup(entry as NavEntry)
  const isPageRow = !isTabRow && !isLinkRow && !isGroupRow && isPage(entry as NavEntry)

  if (isTabRow && isExternalTabRow) {
    const tab = entry as ExternalTab
    iconName = tab.icon
    iconNode = tab.icon ? (
      <IconRender name={tab.icon} size={14} />
    ) : (
      <ExternalLink size={14} className="text-fd-muted-foreground" />
    )
    canonicalUrl = tab.url
    labelNode = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InlineEdit
          value={tab.title}
          placeholder="Untitled tab"
          ariaLabel="tab title"
          className="font-medium"
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {title: v}))}
        />
        <span
          className="text-[10px] uppercase tracking-wide text-fd-primary/70"
          title="External-link tab — appears in the header strip and home navbar"
        >
          ext tab
        </span>
        <InlineEdit
          value={tab.url}
          placeholder="https://"
          ariaLabel="tab url"
          className="text-xs text-fd-muted-foreground"
          monospace
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {url: v}))}
        />
        <TagPill
          value={tab.tag}
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {tag: v || undefined}))}
        />
      </div>
    )
  } else if (isTabRow) {
    const tab = entry as InternalTab
    iconName = tab.icon
    iconNode = tab.icon ? <IconRender name={tab.icon} size={14} /> : <Layers size={14} className="text-fd-primary" />
    canonicalUrl = tab.slug ? `/${tab.slug}` : "/"
    labelNode = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InlineEdit
          value={tab.title}
          placeholder="Untitled tab"
          ariaLabel="tab title"
          className="font-medium"
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {title: v}))}
        />
        <span className="text-[10px] uppercase tracking-wide text-fd-muted-foreground">tab</span>
        <SlugPill
          value={tab.slug}
          ariaLabel="tab slug"
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {slug: v}))}
        />
        <TagPill
          value={tab.tag}
          onCommit={v => onUpdate(updateAt<Tab>(config, node.path, {tag: v || undefined}))}
        />
      </div>
    )
  } else if (isLinkRow) {
    const link = entry as LinkRef
    iconName = link.icon
    iconNode = link.icon ? (
      <IconRender name={link.icon} size={14} />
    ) : (
      <ExternalLink size={14} className="text-fd-muted-foreground" />
    )
    canonicalUrl = link.url
    labelNode = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InlineEdit
          value={link.name}
          placeholder="Link name"
          ariaLabel="link name"
          onCommit={v => onUpdate(updateAt<LinkRef>(config, node.path, {name: v}))}
        />
        <InlineEdit
          value={link.url}
          placeholder="https://"
          ariaLabel="link URL"
          className="text-xs text-fd-muted-foreground"
          monospace
          onCommit={v => onUpdate(updateAt<LinkRef>(config, node.path, {url: v}))}
        />
        <TagPill
          value={link.tag}
          onCommit={v => onUpdate(updateAt<LinkRef>(config, node.path, {tag: v || undefined}))}
        />
      </div>
    )
  } else if (isGroupRow) {
    const g = entry as GroupRef
    iconName = g.icon
    iconNode = g.icon ? <IconRender name={g.icon} size={14} /> : <Folder size={14} className="text-fd-muted-foreground" />
    canonicalUrl = g.slug ?? ""
    // Resolve the effective sidebar rendering mode so the row carries the
    // same visual cue the user will see once `apply-nav` runs. Mirrors the
    // logic in `scripts/apply-nav.mjs#resolveGroupMode`.
    const isTopLevelGroup = node.path.length === 2
    const groupMode = g.slug
      ? resolveGroupMode(g, {isTopLevelInTab: isTopLevelGroup})
      : null
    const modePill =
      groupMode === "flatten"
        ? {label: "heading", title: "Renders as a `--- Title ---` heading with children inlined into the parent."}
        : groupMode === "section"
          ? {label: "section", title: "Renders as a non-collapsible separator-styled header with children nested below."}
          : null
    labelNode = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InlineEdit
          value={g.group}
          placeholder="Section name"
          ariaLabel="section title"
          className="font-medium"
          onCommit={v => onUpdate(updateAt<GroupRef>(config, node.path, {group: v}))}
        />
        <SlugPill
          value={g.slug ?? ""}
          ariaLabel="section slug"
          emptyLabel="sidebar-only"
          onCommit={v => onUpdate(updateAt<GroupRef>(config, node.path, {slug: v || undefined}))}
        />
        {modePill && (
          <span
            className="rounded border border-fd-border bg-fd-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fd-muted-foreground"
            title={modePill.title}
          >
            {modePill.label}
          </span>
        )}
        <TagPill
          value={g.tag}
          onCommit={v => onUpdate(updateAt<GroupRef>(config, node.path, {tag: v || undefined}))}
        />
      </div>
    )
  } else if (isPageRow) {
    const p = entry as PageRef
    // Effective icon: editor override > MDX frontmatter > none. `""` is the
    // explicit-clear sentinel and shows the no-icon placeholder.
    iconName = resolvePageIcon(p, icons)
    iconNode = iconName ? (
      <IconRender name={iconName} size={14} />
    ) : (
      <FileText size={14} className="text-fd-muted-foreground" />
    )
    canonicalUrl = pageCanonicalUrl(config, node.path)
    const fallbackTitle = titles[p.id] ?? p.id.split("/").pop() ?? p.id
    labelNode = (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InlineEdit
          value={p.title ?? ""}
          placeholder={fallbackTitle}
          ariaLabel="page title"
          onCommit={v => onUpdate(updateAt<PageRef>(config, node.path, {title: v || undefined}))}
        />
        <SlugPill
          value={p.slug ?? ""}
          ariaLabel="page slug"
          emptyLabel={p.id.split("/").pop() ?? "(auto)"}
          monospace
          onCommit={v => onUpdate(updateAt<PageRef>(config, node.path, {slug: v || undefined}))}
        />
        <span className="truncate text-xs text-fd-muted-foreground" title={`/${canonicalUrl}`}>
          /{canonicalUrl}
        </span>
        <TagPill
          value={p.tag}
          onCommit={v => onUpdate(updateAt<PageRef>(config, node.path, {tag: v || undefined}))}
        />
      </div>
    )
  }

  void iconName

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {showInsertBarBefore && <InsertBar indent={indent} />}
      <div
        onClick={onSelect}
        onContextMenu={openContextMenu}
        className={`group flex items-center gap-1.5 py-1 pr-2 ${
          selected ? "bg-fd-primary/10" : "hover:bg-fd-accent/40"
        } ${showDropInside ? "ring-2 ring-inset ring-fd-primary/40" : ""} cursor-pointer`}
        style={{paddingLeft: indent}}
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
        {isExpandable ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="flex h-4 w-4 items-center justify-center text-fd-muted-foreground hover:text-fd-foreground"
            aria-label={expanded ? "collapse" : "expand"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <IconButton name={iconName} fallback={iconNode} onClick={rect => onIconClick(node.path, rect)} />
        <span className="flex min-w-0 flex-1 items-center text-sm">{labelNode}</span>
        <button
          type="button"
          aria-label="more actions"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onClick={e => {
            e.stopPropagation()
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            onMenuClick(node.path, rect)
          }}
        >
          <MoreHorizontal size={14} className="text-fd-muted-foreground hover:text-fd-foreground" />
        </button>
      </div>
      {showInsertBarAfter && <InsertBar indent={indent} />}
    </div>
  )
}

function IconButton({
  name,
  fallback,
  onClick,
}: {
  name: string | undefined
  fallback: React.ReactNode
  onClick: (rect: DOMRect | null) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      aria-label={name ? `icon: ${name}` : "set icon"}
      title={name ? `icon: ${name}` : "click to set an icon"}
      onClick={e => {
        e.stopPropagation()
        onClick(ref.current?.getBoundingClientRect() ?? null)
      }}
      className="flex h-5 w-5 items-center justify-center rounded hover:bg-fd-accent"
    >
      {fallback}
    </button>
  )
}

function InlineEdit({
  value,
  placeholder,
  onCommit,
  className,
  ariaLabel,
  monospace,
}: {
  value: string
  placeholder?: string
  onCommit: (next: string) => void
  className?: string
  ariaLabel?: string
  monospace?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (!editing) {
    return (
      <button
        type="button"
        title={value || placeholder}
        onDoubleClick={e => {
          e.stopPropagation()
          setDraft(value)
          setEditing(true)
        }}
        aria-label={ariaLabel}
        className={`truncate text-left ${value ? "" : "text-fd-muted-foreground italic"} ${
          monospace ? "font-mono" : ""
        } ${className ?? ""}`}
      >
        {value || placeholder || "Untitled"}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={ariaLabel}
      onChange={e => setDraft(e.target.value)}
      onClick={e => e.stopPropagation()}
      onBlur={() => {
        setEditing(false)
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === "Escape") {
          e.preventDefault()
          setDraft(value)
          setEditing(false)
        }
        e.stopPropagation()
      }}
      placeholder={placeholder}
      className={`min-w-0 flex-1 rounded border border-fd-primary/40 bg-fd-background px-1 py-0.5 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40 ${
        monospace ? "font-mono text-xs" : ""
      } ${className ?? ""}`}
    />
  )
}

function SlugPill({
  value,
  onCommit,
  emptyLabel,
  ariaLabel,
  monospace,
}: {
  value: string
  onCommit: (next: string) => void
  emptyLabel?: string
  ariaLabel?: string
  monospace?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const display = value || emptyLabel || "/"
  const baseClass =
    "rounded bg-fd-muted/40 px-1.5 py-0.5 text-[10px] text-fd-muted-foreground hover:bg-fd-muted/70"

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title={value ? `/${value}` : "click to set a slug"}
        onClick={e => {
          e.stopPropagation()
          setDraft(value)
          setEditing(true)
        }}
        className={`${baseClass} ${monospace ? "font-mono" : ""} ${value ? "" : "italic text-fd-muted-foreground/70"}`}
      >
        {value ? `/${display}` : display}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={ariaLabel}
      onChange={e => setDraft(e.target.value)}
      onClick={e => e.stopPropagation()}
      onBlur={() => {
        setEditing(false)
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === "Escape") {
          e.preventDefault()
          setDraft(value)
          setEditing(false)
        }
        e.stopPropagation()
      }}
      placeholder="slug"
      className={`w-[120px] rounded border border-fd-primary/40 bg-fd-background px-1 py-0.5 text-[10px] outline-none focus:ring-2 focus:ring-fd-primary/40 ${
        monospace ? "font-mono" : ""
      }`}
    />
  )
}

function TagPill({
  value,
  onCommit,
}: {
  value: string | undefined
  onCommit: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (!editing && !value) {
    return (
      <button
        type="button"
        title="add tag"
        onClick={e => {
          e.stopPropagation()
          setDraft("")
          setEditing(true)
        }}
        className="ml-auto rounded px-1 py-0.5 text-[10px] text-fd-muted-foreground/40 opacity-0 hover:bg-fd-accent/40 hover:text-fd-muted-foreground group-hover:opacity-100"
      >
        + tag
      </button>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        title="edit tag"
        onClick={e => {
          e.stopPropagation()
          setDraft(value ?? "")
          setEditing(true)
        }}
        className="ml-auto rounded bg-fd-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-fd-primary"
      >
        {value}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onClick={e => e.stopPropagation()}
      onBlur={() => {
        setEditing(false)
        if ((draft || "") !== (value || "")) onCommit(draft)
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === "Escape") {
          e.preventDefault()
          setDraft(value ?? "")
          setEditing(false)
        }
        e.stopPropagation()
      }}
      placeholder="tag"
      className="ml-auto w-[80px] rounded border border-fd-primary/40 bg-fd-background px-1 py-0.5 text-[10px] outline-none focus:ring-2 focus:ring-fd-primary/40"
    />
  )
}

function InsertBar({indent}: {indent: number}) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 h-[2px] bg-fd-primary"
      style={{marginLeft: indent}}
    />
  )
}

function DragGhostNode({node, titles}: {node: FlatNode; titles: Record<string, string>}) {
  const entry = node.entry
  let label = ""
  if (node.path.length === 1) label = (entry as Tab).title
  else if (isLink(entry as NavEntry)) label = (entry as LinkRef).name
  else if (isGroup(entry as NavEntry)) label = (entry as GroupRef).group
  else if (isPage(entry as NavEntry)) {
    const p = entry as PageRef
    label = p.title ?? titles[p.id] ?? p.id
  }
  return <DragGhostLabel label={label} />
}

function DragGhostLabel({label, icon}: {label: string; icon?: React.ReactNode}) {
  return (
    <div className="flex items-center gap-2 rounded border border-fd-border bg-fd-popover px-2 py-1.5 text-sm shadow-xl">
      {icon ?? <GripVertical size={14} className="text-fd-muted-foreground" />}
      <span className="truncate max-w-[280px]">{label}</span>
    </div>
  )
}

function RowMenu({
  state,
  config,
  onClose,
  onUpdate,
  allSlugs,
  titles,
}: {
  state: MenuState
  config: NavConfig
  onClose: () => void
  onUpdate: (next: NavConfig, newSelection?: Path | null) => void
  allSlugs: string[]
  titles: Record<string, string>
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pickerOpen) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, pickerOpen])

  const left = state.rect ? Math.min(window.innerWidth - 240, state.rect.left + 4) : 100
  const top = state.rect ? Math.min(window.innerHeight - 280, state.rect.top + 4) : 100

  const isTab = state.path.length === 1
  const node = getAt(config, state.path)
  const isLinkNode = node !== null && !isTab && isLink(node as NavEntry)
  const isGroupNode = node !== null && !isTab && !isLinkNode && isGroup(node as NavEntry)
  const isPageNode = node !== null && !isTab && !isLinkNode && !isGroupNode && isPage(node as NavEntry)
  const groupHasSlug = isGroupNode && Boolean((node as GroupRef).slug)
  const tabIndex = state.path[0]
  const sourceTab = isTab ? config.tabs[tabIndex] : null
  const isExternalTabNode = isTab && sourceTab !== null && isExternalTab(sourceTab)
  const isInternalTabNode = isTab && sourceTab !== null && isInternalTab(sourceTab)
  // Demote only makes sense between two internal tabs (external tabs have
  // no folder to fold into).
  const canDemote =
    isInternalTabNode &&
    Boolean((sourceTab as InternalTab).slug) &&
    config.tabs.filter(isInternalTab).length > 1
  const demoteTargets = canDemote
    ? config.tabs
        .map((t, i) => ({tab: t, index: i}))
        .filter(({tab, index}) => index !== tabIndex && isInternalTab(tab))
    : []

  function applyAndClose(next: NavConfig, sel?: Path | null) {
    onUpdate(next, sel)
    onClose()
  }

  function duplicate() {
    const parent = pathParent(state.path)
    const idx = state.path[state.path.length - 1]
    const clone = JSON.parse(JSON.stringify(node))
    if (!clone) return
    if (isTab) clone.id = `${(clone as Tab).id}-copy`
    applyAndClose(insertAt(config, parent, idx + 1, clone), [...parent, idx + 1])
  }

  function convertToLink() {
    applyAndClose(updateAt(config, state.path, {type: "link", name: "External link", url: "https://"}))
  }

  function addLinkBelow() {
    if (isTab) {
      // On an internal tab, "add link below" means append a link inside the
      // tab so the new entry inherits the tab's container. External tabs
      // have no `pages[]` — this branch isn't reachable for them (the menu
      // item is hidden below).
      const tab = config.tabs[tabIndex]
      if (!tab || !isInternalTab(tab)) return
      const insideIdx = tab.pages.length
      applyAndClose(
        insertAt(config, [tabIndex], insideIdx, newLink("New link", "https://")),
        [tabIndex, insideIdx],
      )
      return
    }
    const parent = pathParent(state.path)
    const idx = state.path[state.path.length - 1] + 1
    applyAndClose(insertAt(config, parent, idx, newLink("New link", "https://")), [...parent, idx])
  }

  function makeTabExternal() {
    applyAndClose(convertTabToExternal(config, tabIndex), [tabIndex])
  }

  function makeTabInternal() {
    applyAndClose(convertTabToInternal(config, tabIndex), [tabIndex])
  }

  function promoteSelected() {
    const {config: next, newPath} = promoteToTab(config, state.path)
    if (next === config) return
    applyAndClose(next, newPath)
  }

  function demoteSelected(targetIndex: number) {
    const {config: next, newPath} = demoteTabToGroup(config, tabIndex, targetIndex)
    if (next === config) return
    applyAndClose(next, newPath)
  }

  function convertLink(pageId: string) {
    applyAndClose(convertLinkToPage(config, state.path, pageId), state.path)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[240px] rounded-md border border-fd-border bg-fd-popover py-1 text-sm shadow-xl"
        style={{left, top}}
        onClick={e => e.stopPropagation()}
      >
        <MenuItem icon={<Copy size={14} />} label="Duplicate" onClick={duplicate} />
        {!isExternalTabNode && (
          <MenuItem
            icon={<Plus size={14} />}
            label={isTab ? "Add link inside" : "Add link below"}
            onClick={addLinkBelow}
          />
        )}
        {(isPageNode || isGroupNode) && (
          <MenuItem
            icon={<Link2 size={14} />}
            label="Convert to external link"
            onClick={convertToLink}
          />
        )}
        {isLinkNode && (
          <MenuItem
            icon={<FileText size={14} />}
            label="Convert to internal page…"
            onClick={() => setPickerOpen(true)}
          />
        )}
        {isInternalTabNode && (
          <MenuItem
            icon={<Link2 size={14} />}
            label="Convert to external tab"
            onClick={makeTabExternal}
          />
        )}
        {isExternalTabNode && (
          <MenuItem
            icon={<FileText size={14} />}
            label="Convert to internal tab"
            onClick={makeTabInternal}
          />
        )}
        {isGroupNode && groupHasSlug && (
          <MenuItem
            icon={<ArrowUpToLine size={14} />}
            label="Promote section to tab"
            onClick={promoteSelected}
          />
        )}
        {canDemote && (
          <>
            <div className="my-1 border-t border-fd-border" />
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-fd-muted-foreground">
              Demote tab into…
            </div>
            {demoteTargets.map(({tab, index}) => (
              <MenuItem
                key={tab.id}
                icon={<FolderInput size={14} />}
                label={tab.title || tab.id}
                onClick={() => demoteSelected(index)}
              />
            ))}
          </>
        )}
        <div className="my-1 border-t border-fd-border" />
        <MenuItem
          icon={<Trash2 size={14} />}
          label="Delete"
          destructive
          onClick={() => applyAndClose(removeAt(config, state.path), null)}
        />
      </div>
      {pickerOpen && (
        <LinkToPagePicker
          allSlugs={allSlugs}
          titles={titles}
          onClose={() => setPickerOpen(false)}
          onPick={convertLink}
        />
      )}
    </>
  )
}

function LinkToPagePicker({
  allSlugs,
  titles,
  onClose,
  onPick,
}: {
  allSlugs: string[]
  titles: Record<string, string>
  onClose: () => void
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allSlugs.slice(0, 200)
    return allSlugs
      .filter(slug => {
        const title = titles[slug] ?? ""
        return slug.toLowerCase().includes(q) || title.toLowerCase().includes(q)
      })
      .slice(0, 200)
  }, [query, allSlugs, titles])

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
        const slug = filtered[active]
        if (slug) onPick(slug)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [filtered, active, onClose, onPick])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm"
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
          placeholder="Pick an internal page (path or title)…"
          className="w-full border-b border-fd-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-fd-muted-foreground">No matches.</li>
          )}
          {filtered.map((slug, i) => (
            <li
              key={slug}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(slug)}
              className={`flex cursor-pointer items-baseline justify-between px-4 py-2 text-sm ${
                i === active ? "bg-fd-accent" : ""
              }`}
            >
              <div className="flex flex-col">
                <span>{titles[slug] ?? slug.split("/").pop()}</span>
                <span className="text-xs text-fd-muted-foreground">/{slug}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-fd-accent ${
        destructive ? "text-fd-destructive" : "text-fd-foreground"
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center text-fd-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
