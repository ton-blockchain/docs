"use client"
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from "react"
import type {NavConfig} from "@/lib/nav-types"
import {collectReferencedIds} from "@/lib/nav-types"
import type {EditorState} from "../_lib/load-state"
import {useUndoable} from "../_lib/use-undoable"
import {
  type Path,
  collectTabSlugs,
  demoteTabToGroup,
  findPathById,
  flattenTree,
  getAt,
  insertAt,
  newGroup,
  newLink,
  newPage,
  newTab,
  pathKey,
  pathParent,
  pathsEqual,
  promoteToTab,
  removeAt,
  updateAt,
} from "../_lib/tree-ops"
import {isGroup, isInternalTab, isLink, isPage} from "@/lib/nav-types"
import type {GroupRef, LinkRef, NavEntry, PageRef, Tab} from "@/lib/nav-types"
import {TreeDndProvider, TreeView} from "./tree-view"
import {Inspector} from "./inspector"
import {SaveBar} from "./save-bar"
import {OrphansTray} from "./orphans-tray"
import {CommandPalette, type PaletteAction} from "./command-palette"
import {MovePreviewDrawer} from "./move-preview"
import {NavbarLinksPanel} from "./navbar-links-panel"

const STORAGE_KEY = "nav-editor:state-v1"

/**
 * Subscribe to a no-op store that always reports `true` on the client and
 * `false` on the server (or on the very first hydration tick). React's
 * built-in `useSyncExternalStore` semantics keep server markup and the
 * initial client render in agreement, then flip on the next commit — no
 * hydration warning, no `setState`-in-effect lint trigger.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/**
 * Skip SSR for the entire editor subtree. The page is dev-only (gated by
 * `NAV_EDITOR=1`) and has no SEO value, while its children — `@dnd-kit`'s
 * `DndContext` (module-level `aria-describedby` counter) and `useUndoable`
 * (localStorage rehydration during initial render) — both hydrate
 * differently on the server and the client. Rendering `null` until
 * mounted avoids both mismatches in one shot.
 */
export function NavEditor(props: {initial: EditorState}) {
  const mounted = useIsClient()
  if (!mounted) return null
  return <NavEditorImpl {...props} />
}

function NavEditorImpl({initial}: {initial: EditorState}) {
  const {value: config, set: setConfig, undo, redo, canUndo, canRedo, reset: resetConfig} = useUndoable(
    initial.config,
    {storageKey: `${STORAGE_KEY}:config`},
  )

  // The "baseline" is the last saved version on disk — used to compute
  // dirty-state and change counts.
  const [baseline, setBaseline] = useState<NavConfig>(initial.config)
  const [lastSavedAt, setLastSavedAt] = useState<string>(initial.lastSavedAt)

  const [selected, setSelected] = useState<Path | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // By default expand all tabs.
    const s = new Set<string>()
    for (let i = 0; i < initial.config.tabs.length; i++) s.add(pathKey([i]))
    return s
  })
  const toggleExpandKey = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const [orphanAcknowledged, setOrphanAcknowledged] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMoves, setPreviewMoves] = useState<Array<{from: string; to: string}>>([])
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle")
  const [saveLog, setSaveLog] = useState("")
  const titles = initial.titles
  const icons = initial.icons

  // Orphans derived live from config + filesystem snapshot.
  const orphans = useMemo(() => {
    const refs = collectReferencedIds(config)
    return initial.allSlugs.filter(s => !refs.has(s))
  }, [config, initial.allSlugs])

  // Hotkeys.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isInInput) {
          e.preventDefault()
          undo()
        }
        return
      }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        if (!isInInput) {
          e.preventDefault()
          redo()
        }
        return
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void openPreview()
        return
      }
      if (isInInput) return
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        moveSelection(e.key === "ArrowDown" ? 1 : -1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        toggleExpand(selected, true)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        // If already collapsed (or non-expandable), jump to parent.
        if (!selected) return
        const key = pathKey(selected)
        const node = getAt(config, selected)
        const expandable =
          selected.length === 1 || (node && isGroup(node as NavEntry))
        if (expandable && expanded.has(key)) toggleExpand(selected, false)
        else if (selected.length > 1) setSelected(pathParent(selected))
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selected) {
          e.preventDefault()
          deleteSelected()
        }
      } else if (e.key === "Enter") {
        if (!selected) return
        e.preventDefault()
        renameSelected()
      } else if (e.key === " ") {
        if (!selected) return
        e.preventDefault()
        toggleExpand(selected)
      } else if (e.key === "Escape") {
        setSelected(null)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, selected, expanded])

  function toggleExpand(path: Path | null, force?: boolean) {
    if (!path) return
    setExpanded(prev => {
      const next = new Set(prev)
      const key = pathKey(path)
      const wasExpanded = next.has(key)
      const target = force === undefined ? !wasExpanded : force
      if (target) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function moveSelection(delta: number) {
    const flat = flattenTree(config, expanded)
    if (flat.length === 0) return
    const idx = selected ? flat.findIndex(n => pathsEqual(n.path, selected)) : -1
    const nextIdx = Math.max(0, Math.min(flat.length - 1, (idx === -1 ? 0 : idx) + delta))
    setSelected(flat[nextIdx].path)
  }

  function deleteSelected() {
    if (!selected) return
    setConfig(prev => removeAt(prev, selected))
    setSelected(null)
  }

  function focusPath(path: Path) {
    setSelected(path)
    setExpanded(prev => {
      const next = new Set(prev)
      for (let i = 1; i <= path.length; i++) next.add(pathKey(path.slice(0, i)))
      return next
    })
  }

  function addEntryUnderSelection(make: () => NavEntry) {
    const anchor = selected ?? (config.tabs.length > 0 ? [0] : null)
    setConfig(prev => {
      let containerPath: Path = []
      if (anchor) {
        const node = getAt(prev, anchor)
        const isContainer =
          anchor.length === 0 ||
          anchor.length === 1 ||
          (node !== null && isGroup(node as NavEntry))
        containerPath = isContainer ? anchor : pathParent(anchor)
      }
      const container =
        containerPath.length === 0
          ? prev.tabs
          : ((getAt(prev, containerPath) as {pages?: NavEntry[] | Tab[]}).pages ?? [])
      const insertIdx = container.length
      const next = insertAt(prev, containerPath, insertIdx, make())
      queueMicrotask(() => setSelected([...containerPath, insertIdx]))
      return next
    })
  }

  function renameSelected() {
    if (!selected) return
    const node = getAt(config, selected)
    if (!node) return
    const isTabNode = selected.length === 1
    const current = isTabNode
      ? (node as Tab).title
      : isLink(node as NavEntry)
        ? (node as LinkRef).name
        : isGroup(node as NavEntry)
          ? (node as GroupRef).group
          : (node as PageRef).title ?? titles[(node as PageRef).id] ?? (node as PageRef).id
    const next = window.prompt("Rename", current ?? "")
    if (next == null) return
    if (isTabNode) setConfig(prev => updateAt<Tab>(prev, selected, {title: next}))
    else if (isLink(node as NavEntry))
      setConfig(prev => updateAt<LinkRef>(prev, selected, {name: next}))
    else if (isGroup(node as NavEntry))
      setConfig(prev => updateAt<GroupRef>(prev, selected, {group: next}))
    else setConfig(prev => updateAt<PageRef>(prev, selected, {title: next || undefined}))
  }

  function convertToLink() {
    if (!selected) return
    setConfig(prev =>
      updateAt(prev, selected, {type: "link", name: "External link", url: "https://"}),
    )
  }

  const handleUpdate = useCallback(
    (next: NavConfig, newSelection?: Path | null) => {
      setConfig(next)
      if (newSelection !== undefined) setSelected(newSelection)
    },
    [setConfig],
  )

  const handleOrphanDrop = useCallback(
    (id: string, containerPath: Path, index: number) => {
      setConfig(prev => {
        const next = insertAt(prev, containerPath, index, newPage(id))
        return next
      })
      setSelected([...containerPath, index])
    },
    [setConfig],
  )

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline])
  const changeCount = dirty ? countChanges(baseline, config) : 0

  const warnings = useMemo(() => {
    const w: string[] = []
    if (orphans.length > 0 && !orphanAcknowledged) {
      w.push(`${orphans.length} orphan .mdx files not placed in nav — acknowledge to save.`)
    }
    return w
  }, [orphans, orphanAcknowledged])

  async function openPreview() {
    if (!dirty) return
    setSaveLog("")
    setSaveStatus("idle")
    try {
      const res = await fetch("/nav-editor/api/plan", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({config}),
      })
      const data = (await res.json()) as {moves: Array<{from: string; to: string}>; output: string}
      setPreviewMoves(data.moves ?? [])
      setSaveLog(data.output ?? "")
    } catch (e) {
      setPreviewMoves([])
      setSaveLog(String(e))
    }
    setPreviewOpen(true)
  }

  async function confirmSave() {
    setSaveStatus("saving")
    setSaveLog("")
    try {
      const res = await fetch("/nav-editor/api/save", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({config, lastSavedAt}),
      })
      if (!res.ok) {
        const text = await res.text()
        setSaveLog(text)
        setSaveStatus("error")
        return
      }
      let nextLastSavedAt: string | null = null
      if (!res.body) {
        setSaveStatus("idle")
      } else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ""
        for (;;) {
          const {done, value} = await reader.read()
          if (done) break
          buf += decoder.decode(value, {stream: true})
          let nl
          while ((nl = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, nl)
            buf = buf.slice(nl + 2)
            const eventMatch = chunk.match(/^event: (\w+)\s*\n/)
            const dataMatch = chunk.match(/^data: (.*)$/m)
            if (eventMatch && dataMatch) {
              const ev = eventMatch[1]
              const data = dataMatch[1].replace(/\\n/g, "\n")
              if (ev === "stdout" || ev === "stderr") {
                setSaveLog(prev => prev + data)
              } else if (ev === "done") {
                setSaveStatus("idle")
                try {
                  const payload = JSON.parse(data) as {code: number; lastSavedAt?: string}
                  if (payload.lastSavedAt) nextLastSavedAt = payload.lastSavedAt
                } catch {
                  // server didn't include a payload; keep previous lastSavedAt
                }
              }
            }
          }
        }
      }
      setBaseline(config)
      if (nextLastSavedAt) setLastSavedAt(nextLastSavedAt)
      setPreviewOpen(false)
    } catch (e) {
      setSaveStatus("error")
      setSaveLog(String(e))
    }
  }

  // Build command palette actions.
  const paletteActions: PaletteAction[] = useMemo(() => {
    const actions: PaletteAction[] = [
      {id: "save", title: "Save changes…", shortcut: "⌘S", onRun: () => void openPreview()},
      {id: "undo", title: "Undo", shortcut: "⌘Z", onRun: undo},
      {id: "redo", title: "Redo", shortcut: "⌘⇧Z", onRun: redo},
      {
        id: "rename",
        title: "Rename selected…",
        hint: selected ? `Rename ${describeSelected(config, selected, titles)}` : "Select an entry first",
        onRun: renameSelected,
      },
      {
        id: "convert-link",
        title: "Convert selected → external link",
        hint: "Replaces the page/group with a link",
        onRun: convertToLink,
      },
      {
        id: "add-tab",
        title: "New tab",
        hint: "Append a new top-level tab (folder-backed)",
        onRun: () => {
          setConfig(prev =>
            insertAt(prev, [], prev.tabs.length, newTab("New tab", undefined, collectTabSlugs(prev))),
          )
          queueMicrotask(() => setSelected([config.tabs.length]))
        },
      },
      {
        id: "add-section",
        title: "New section in selected",
        hint: "Append a folder-backed group to the selected container",
        onRun: () => addEntryUnderSelection(() => newGroup("New section", "new-section")),
      },
      {
        id: "add-page",
        title: "New page placeholder",
        hint: "Inserts a page entry; bind to an id afterwards",
        onRun: () => addEntryUnderSelection(() => newPage("untitled")),
      },
      {
        id: "add-link",
        title: "New external link",
        onRun: () => addEntryUnderSelection(() => newLink("New link", "https://")),
      },
      {
        id: "delete",
        title: "Delete selected",
        shortcut: "Del",
        hint: "Remove the selected entry (orphans its pages)",
        onRun: deleteSelected,
      },
      {
        id: "toggle-orphans",
        title: orphanAcknowledged ? "Hide acknowledgement of orphans" : "Acknowledge orphan budget",
        hint: `${orphans.length} unplaced mdx file(s)`,
        onRun: () => setOrphanAcknowledged(v => !v),
      },
    ]

    // Promote / demote actions, contextual to the current selection.
    if (selected) {
      const node = getAt(config, selected)
      if (node && selected.length >= 2 && isGroup(node as NavEntry)) {
        const group = node as GroupRef
        if (group.slug) {
          actions.push({
            id: "promote-to-tab",
            title: "Promote section → tab",
            hint: `Lift "${group.group}" into a top-level tab`,
            onRun: () => {
              const {config: next, newPath} = promoteToTab(config, selected)
              if (next === config) return
              setConfig(next)
              queueMicrotask(() => setSelected(newPath))
            },
          })
        }
      }
      if (selected.length === 1 && config.tabs.length > 1) {
        const tabIndex = selected[0]
        const source = config.tabs[tabIndex]
        // Demote only applies to internal tabs (external tabs have no slug
        // / pages — there's nothing to fold into another tab).
        if (source && isInternalTab(source) && source.slug) {
          for (let i = 0; i < config.tabs.length; i++) {
            if (i === tabIndex) continue
            const target = config.tabs[i]
            if (!isInternalTab(target)) continue
            const targetIndex = i
            actions.push({
              id: `demote-to-section:${target.id}`,
              title: `Demote tab → "${target.title || target.id}"`,
              hint: `Fold "${source.title || source.id}" back as a section`,
              onRun: () => {
                const {config: next, newPath} = demoteTabToGroup(config, tabIndex, targetIndex)
                if (next === config) return
                setConfig(next)
                queueMicrotask(() => setSelected(newPath))
              },
            })
          }
        }
      }
    }

    // Page-finder actions sorted by title.
    const seen = new Set<string>()
    const tree = flattenTree(config, new Set(initial.config.tabs.map((_, i) => pathKey([i]))))
    for (const node of tree) {
      const entry = node.entry as NavEntry | Tab
      if (node.path.length === 1) continue
      if (!isPage(entry as NavEntry)) continue
      const p = entry as PageRef
      seen.add(p.id)
      actions.push({
        id: `find:${p.id}`,
        title: titles[p.id] ?? p.title ?? p.id,
        hint: `/${p.id}`,
        onRun: () => focusPath(node.path),
      })
    }
    // Orphan-finder actions for unplaced ids.
    for (const slug of orphans.slice(0, 200)) {
      if (seen.has(slug)) continue
      actions.push({
        id: `orphan:${slug}`,
        title: titles[slug] ?? slug,
        hint: `orphan · /${slug}`,
        onRun: () => {
          const path = findPathById(config, slug)
          if (path) focusPath(path)
        },
      })
    }
    return actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, selected, titles, orphans, orphanAcknowledged])

  // Keep the storage key for legacy purposes (the undoable hook handles persistence).
  const _ = useRef(STORAGE_KEY)
  void _

  return (
    <div className="flex h-full flex-col bg-fd-background">
      <header className="flex h-12 items-center justify-between border-b border-fd-border px-4 text-sm">
        <div className="flex items-center gap-3">
          <strong className="text-fd-foreground">Navigation editor</strong>
          <span className="text-fd-muted-foreground">{config.tabs.length} tab(s) · {initial.allSlugs.length} pages</span>
        </div>
        <div className="text-xs text-fd-muted-foreground">
          ⌘K commands · ⌘Z/⌘⇧Z undo · ⌘S save
        </div>
      </header>
      <TreeDndProvider
        config={config}
        onUpdate={handleUpdate}
        onOrphanDrop={handleOrphanDrop}
        expanded={expanded}
        onToggleExpand={toggleExpandKey}
        titles={titles}
      >
        <div className="flex flex-1 overflow-hidden">
          <OrphansTray
            orphans={orphans}
            titles={titles}
            onAcknowledge={setOrphanAcknowledged}
            acknowledged={orphanAcknowledged}
          />
          <main className="flex-1 overflow-y-auto">
            <NavbarLinksPanel config={config} onUpdate={handleUpdate} />
            <TreeView
              config={config}
              expanded={expanded}
              onToggleExpand={toggleExpandKey}
              selected={selected}
              onSelect={setSelected}
              onUpdate={handleUpdate}
              titles={titles}
              icons={icons}
              allSlugs={initial.allSlugs}
            />
          </main>
          <Inspector
            config={config}
            selected={selected}
            onUpdate={handleUpdate}
            onSelect={setSelected}
            titles={titles}
            icons={icons}
          />
        </div>
      </TreeDndProvider>
      <SaveBar
        dirty={dirty}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onPreviewSave={openPreview}
        saveStatus={saveStatus}
        changeCount={changeCount}
        moveCount={previewMoves.length}
        warnings={warnings}
        blocked={orphans.length > 0 && !orphanAcknowledged}
        blockedReason={
          orphans.length > 0 && !orphanAcknowledged
            ? `${orphans.length} orphan .mdx file${orphans.length === 1 ? "" : "s"} — acknowledge in the side panel to save.`
            : undefined
        }
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      <MovePreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={confirmSave}
        moves={previewMoves}
        saveLog={saveLog}
        saving={saveStatus === "saving"}
        warnings={warnings}
      />
      <ResetWatcher
        baseline={baseline}
        config={config}
        onReset={(next: NavConfig) => {
          // Programmatic reset of the undo stack post-save.
          resetConfig(next)
        }}
      />
    </div>
  )
}

/**
 * Approximate the number of changed entries between two configs by comparing
 * stringified subtrees. Used purely for the "N unsaved changes" badge.
 */
function countChanges(a: NavConfig, b: NavConfig): number {
  let count = 0
  const al = JSON.stringify(a)
  const bl = JSON.stringify(b)
  if (al === bl) return 0
  // Approximate: count differing tab subtrees.
  const lenA = a.tabs.length
  const lenB = b.tabs.length
  if (lenA !== lenB) count += Math.abs(lenA - lenB)
  const minLen = Math.min(lenA, lenB)
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(a.tabs[i]) !== JSON.stringify(b.tabs[i])) count++
  }
  return Math.max(count, 1)
}

// no-op component used to keep the resetConfig helper in scope without
// adding state dependencies upstream.
function ResetWatcher({
  baseline,
  config,
  onReset,
}: {
  baseline: NavConfig
  config: NavConfig
  onReset: (next: NavConfig) => void
}) {
  void baseline
  void config
  void onReset
  return null
}

function describeSelected(
  config: NavConfig,
  path: Path,
  titles: Record<string, string>,
): string {
  const node = getAt(config, path)
  if (!node) return "(nothing)"
  if (path.length === 1) return `tab "${(node as Tab).title}"`
  if (isLink(node as NavEntry)) return `link "${(node as LinkRef).name}"`
  if (isGroup(node as NavEntry)) return `section "${(node as GroupRef).group}"`
  if (isPage(node as NavEntry)) {
    const p = node as PageRef
    return `page "${p.title ?? titles[p.id] ?? p.id}"`
  }
  return "(unknown)"
}
