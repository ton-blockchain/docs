import type {
  GroupRef,
  LinkRef,
  NavConfig,
  NavEntry,
  PageRef,
  Tab,
} from "@/lib/nav-types"
import {isGroup, isLink, isPage} from "@/lib/nav-types"

/**
 * A `Path` identifies a node in the navigation tree as a chain of indices:
 *   - `path[0]` is the index into `config.tabs`
 *   - `path[1..]` are indices into successive `.pages` arrays.
 *
 * An empty path points to "the config itself" (root). A path of length 1
 * points to a tab. Longer paths point to nested entries inside a tab.
 */
export type Path = number[]

/** Stable React key for a node, derived from its path. */
export function pathKey(path: Path): string {
  return path.length === 0 ? "root" : path.join(".")
}

export function pathParent(path: Path): Path {
  return path.slice(0, -1)
}

export function pathsEqual(a: Path, b: Path): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function pathStartsWith(path: Path, prefix: Path): boolean {
  if (path.length < prefix.length) return false
  for (let i = 0; i < prefix.length; i++) if (path[i] !== prefix[i]) return false
  return true
}

export function pathSiblingsBefore(path: Path): Path {
  if (path.length === 0) return path
  return [...path.slice(0, -1), path[path.length - 1] - 1]
}

export function pathSiblingsAfter(path: Path): Path {
  if (path.length === 0) return path
  return [...path.slice(0, -1), path[path.length - 1] + 1]
}

/** Get the entry at `path` in `config`. Returns null if the path is invalid. */
export function getAt(config: NavConfig, path: Path): NavEntry | Tab | null {
  if (path.length === 0) return null
  const tab = config.tabs[path[0]]
  if (!tab) return null
  if (path.length === 1) return tab
  let cursor: GroupRef | Tab = tab
  for (let i = 1; i < path.length - 1; i++) {
    const pages: NavEntry[] = cursor.pages ?? []
    const child: NavEntry | undefined = pages[path[i]]
    if (!child || !isGroup(child)) return null
    cursor = child
  }
  return (cursor.pages ?? [])[path[path.length - 1]] ?? null
}

/** Shallow-clone config so React picks up state changes. */
function cloneConfig(config: NavConfig): NavConfig {
  const next: NavConfig = {
    version: config.version,
    tabs: config.tabs.map(t => cloneTab(t)),
  }
  if (config.navbarLinks) next.navbarLinks = config.navbarLinks.map(l => ({...l}))
  return next
}

function cloneTab(t: Tab): Tab {
  return {...t, pages: t.pages.map(cloneEntry)}
}

function cloneEntry(e: NavEntry): NavEntry {
  if (isGroup(e)) return {...e, pages: e.pages.map(cloneEntry)}
  return {...e}
}

/**
 * Walk to `path` while cloning every node on the way, then run `mutate` on the
 * deepest container's children array. Returns the mutated copy.
 */
function withMutatedContainer(
  config: NavConfig,
  containerPath: Path,
  mutate: (children: NavEntry[] | Tab[]) => void,
): NavConfig {
  const next = cloneConfig(config)
  if (containerPath.length === 0) {
    mutate(next.tabs)
    return next
  }
  const tab = next.tabs[containerPath[0]]
  if (!tab) return config
  if (containerPath.length === 1) {
    mutate(tab.pages)
    return next
  }
  let cursor: GroupRef | Tab = tab
  for (let i = 1; i < containerPath.length; i++) {
    const pages: NavEntry[] = cursor.pages ?? []
    const child: NavEntry | undefined = pages[containerPath[i]]
    if (!child || !isGroup(child)) return config
    cursor = child
  }
  mutate(cursor.pages)
  return next
}

/**
 * Update the entry at `path` with a shallow patch.
 *
 * `undefined` and `null` values in the patch drop the matching key entirely
 * so JSON stays tidy. Empty strings (`""`) are intentionally preserved —
 * `PageRef.icon === ""` is the editor's explicit-clear sentinel used by
 * `apply-nav` to strip the `icon:` line from MDX frontmatter. All other
 * callers normalise `""` to `undefined` before reaching this helper.
 */
export function updateAt<T extends NavEntry | Tab>(
  config: NavConfig,
  path: Path,
  patch: Partial<T>,
): NavConfig {
  if (path.length === 0) return config
  return withMutatedContainer(config, pathParent(path), children => {
    const idx = path[path.length - 1]
    const current = children[idx] as T | undefined
    if (!current) return
    Object.assign(current as object, patch)
    for (const key of Object.keys(patch)) {
      const v = (patch as Record<string, unknown>)[key]
      if (v === undefined || v === null) {
        delete (current as unknown as Record<string, unknown>)[key]
      }
    }
  })
}

/** Insert `entry` into the container at `containerPath` at `index`. */
export function insertAt(
  config: NavConfig,
  containerPath: Path,
  index: number,
  entry: NavEntry | Tab,
): NavConfig {
  return withMutatedContainer(config, containerPath, children => {
    const clamped = Math.max(0, Math.min(index, children.length))
    ;(children as Array<NavEntry | Tab>).splice(clamped, 0, entry)
  })
}

/** Remove the entry at `path` from its parent. */
export function removeAt(config: NavConfig, path: Path): NavConfig {
  if (path.length === 0) return config
  return withMutatedContainer(config, pathParent(path), children => {
    children.splice(path[path.length - 1], 1)
  })
}

/**
 * Move the entry at `fromPath` to `toContainerPath` at `toIndex`. Returns the
 * new config and the entry's new path (for selection follow-up).
 */
export function moveTo(
  config: NavConfig,
  fromPath: Path,
  toContainerPath: Path,
  toIndex: number,
): {config: NavConfig; newPath: Path} {
  const entry = getAt(config, fromPath)
  if (!entry) return {config, newPath: fromPath}

  // Refuse to move a group into its own descendant.
  if (pathStartsWith(toContainerPath, fromPath)) return {config, newPath: fromPath}

  let next = removeAt(config, fromPath)
  // Adjust index if removal happened earlier in the same parent.
  let adjustedIndex = toIndex
  if (pathsEqual(pathParent(fromPath), toContainerPath) && fromPath[fromPath.length - 1] < toIndex) {
    adjustedIndex = toIndex - 1
  }
  next = insertAt(next, toContainerPath, adjustedIndex, entry as NavEntry | Tab)
  return {config: next, newPath: [...toContainerPath, adjustedIndex]}
}

/** A flat-listing of every node, useful for tree rendering and search. */
export interface FlatNode {
  path: Path
  depth: number
  entry: NavEntry | Tab
  parentPath: Path
  collapsed?: boolean
  hidden?: boolean
}

export function flattenTree(
  config: NavConfig,
  expanded: Set<string>,
  includeChildrenOfCollapsed = false,
): FlatNode[] {
  /** @type {FlatNode[]} */
  const out: FlatNode[] = []
  for (let i = 0; i < config.tabs.length; i++) {
    walk([i], 0, [])
  }
  return out

  function walk(path: Path, depth: number, parentPath: Path) {
    const entry = getAt(config, path)
    if (!entry) return
    const key = pathKey(path)
    const isExpandable = path.length === 1 || isGroup(entry as NavEntry)
    const isExpanded = !isExpandable || expanded.has(key)
    out.push({path, depth, entry, parentPath, collapsed: isExpandable && !isExpanded})

    if (!isExpanded && !includeChildrenOfCollapsed) return
    const children = path.length === 1 ? (entry as Tab).pages : (entry as GroupRef).pages
    if (!children) return
    for (let i = 0; i < children.length; i++) {
      walk([...path, i], depth + 1, path)
    }
  }
}

/**
 * Resolve the canonical URL of a page entry by walking from the root,
 * accumulating folder-backed slugs from tabs/groups along the way.
 */
export function pageCanonicalUrl(config: NavConfig, path: Path): string {
  if (path.length < 2) return ""
  const parts: string[] = []
  const tab = config.tabs[path[0]]
  if (!tab) return ""
  if (tab.slug) parts.push(tab.slug)

  let cursor: GroupRef | Tab = tab
  for (let i = 1; i < path.length - 1; i++) {
    const pages: NavEntry[] = cursor.pages ?? []
    const child: NavEntry | undefined = pages[path[i]]
    if (!child || !isGroup(child)) return ""
    if (child.slug) parts.push(child.slug)
    cursor = child
  }
  const leafPages: NavEntry[] = cursor.pages ?? []
  const leaf: NavEntry | undefined = leafPages[path[path.length - 1]]
  if (!leaf) return ""
  if (isLink(leaf)) return leaf.url
  if (isGroup(leaf)) {
    if (leaf.slug) parts.push(leaf.slug)
    return parts.join("/")
  }
  if (isPage(leaf)) {
    if (leaf.slug === "") return parts.join("/")
    parts.push(leaf.slug ?? leaf.id.split("/").pop() ?? leaf.id)
    return parts.join("/")
  }
  return parts.join("/")
}

/** True iff the entry is a tab (top-level container). */
export function isTab(entry: NavEntry | Tab): entry is Tab {
  return "id" in entry && "slug" in entry && "title" in entry && "pages" in entry && !isGroup(entry) && !isLink(entry) && !isPage(entry)
}

export function newPage(id: string): PageRef {
  return {id}
}

export function newGroup(title: string, slug?: string): GroupRef {
  const grp: GroupRef = {group: title, pages: []}
  if (slug) grp.slug = slug
  return grp
}

export function newLink(name: string, url: string): LinkRef {
  return {type: "link", name, url}
}

// ---------------------------------------------------------------------------
// Header-navbar link helpers
//
// `config.navbarLinks` is a flat ordered list of LinkRefs surfaced in the
// top navigation bar (independent of the in-sidebar tab strip). These helpers
// keep the editor's tree-path machinery untouched — navbar links live outside
// the `tabs[]` namespace.
// ---------------------------------------------------------------------------

function withNavbarLinks(
  config: NavConfig,
  mutate: (list: LinkRef[]) => LinkRef[] | void,
): NavConfig {
  const next = cloneConfig(config)
  const list = next.navbarLinks ? [...next.navbarLinks] : []
  const result = mutate(list)
  const out = Array.isArray(result) ? result : list
  if (out.length === 0) delete next.navbarLinks
  else next.navbarLinks = out
  return next
}

export function addNavbarLink(config: NavConfig, link: LinkRef): NavConfig {
  return withNavbarLinks(config, list => {
    list.push({...link})
  })
}

export function updateNavbarLink(
  config: NavConfig,
  index: number,
  patch: Partial<LinkRef>,
): NavConfig {
  return withNavbarLinks(config, list => {
    const current = list[index]
    if (!current) return
    const merged: LinkRef = {...current, ...patch}
    for (const key of Object.keys(patch)) {
      const v = (patch as Record<string, unknown>)[key]
      if (v === undefined || v === null) {
        delete (merged as unknown as Record<string, unknown>)[key]
      }
    }
    list[index] = merged
  })
}

export function removeNavbarLink(config: NavConfig, index: number): NavConfig {
  return withNavbarLinks(config, list => {
    if (index < 0 || index >= list.length) return
    list.splice(index, 1)
  })
}

export function moveNavbarLink(config: NavConfig, from: number, to: number): NavConfig {
  return withNavbarLinks(config, list => {
    if (from < 0 || from >= list.length) return
    const clampedTo = Math.max(0, Math.min(to, list.length - 1))
    if (from === clampedTo) return
    const [moved] = list.splice(from, 1)
    list.splice(clampedTo, 0, moved)
  })
}

/**
 * Replace the `LinkRef` at `path` with a fresh `PageRef` bound to `id`. Wipes
 * link-only fields (`type`, `name`, `url`) and keeps the surrounding slot
 * index stable so any tree selection in flight still resolves.
 */
export function convertLinkToPage(config: NavConfig, path: Path, id: string): NavConfig {
  if (path.length < 2 || !id) return config
  const current = getAt(config, path)
  if (!current || !isLink(current as NavEntry)) return config
  return withMutatedContainer(config, pathParent(path), children => {
    const idx = path[path.length - 1]
    const link = children[idx] as LinkRef | undefined
    if (!link) return
    const replacement: PageRef = {id}
    // Carry over visual hints if the user had set them on the link.
    if (link.icon) replacement.icon = link.icon
    if (link.tag) replacement.tag = link.tag
    children[idx] = replacement
  })
}

export function newTab(title: string, slug?: string, existingSlugs?: Iterable<string>): Tab {
  const baseId =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `tab-${Math.random().toString(36).slice(2, 7)}`
  const taken = new Set(existingSlugs ?? [])
  // Default slug = same as id (folder-backed). Auto-suffix if it collides.
  let candidate = slug ?? baseId
  if (slug === "") candidate = ""
  if (candidate !== "" && taken.has(candidate)) {
    let n = 2
    while (taken.has(`${candidate}-${n}`)) n++
    candidate = `${candidate}-${n}`
  }
  return {
    id: baseId,
    slug: candidate,
    title,
    pages: [],
  }
}

/**
 * Lift a folder-backed group at `path` into a top-level tab. Returns the new
 * config and the path of the resulting tab. Refuses sidebar-only groups
 * (no slug → cannot be a folder root).
 */
export function promoteToTab(
  config: NavConfig,
  path: Path,
): {config: NavConfig; newPath: Path} {
  if (path.length < 2) return {config, newPath: path}
  const entry = getAt(config, path)
  if (!entry || !isGroup(entry as NavEntry)) return {config, newPath: path}
  const group = entry as GroupRef
  if (!group.slug) return {config, newPath: path}

  const tab: Tab = {
    id:
      group.slug
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .replace(/^-+|-+$/g, "") || `tab-${Math.random().toString(36).slice(2, 7)}`,
    slug: group.slug,
    title: group.group,
    pages: group.pages ?? [],
  }
  if (group.icon) tab.icon = group.icon
  if (group.tag) tab.tag = group.tag
  if (group.expanded) tab.defaultOpen = true

  const next = removeAt(config, path)
  const insertIndex = next.tabs.length
  const inserted = insertAt(next, [], insertIndex, tab)
  return {config: inserted, newPath: [insertIndex]}
}

/**
 * Fold a tab back into another tab as a folder-backed group, appending to the
 * destination tab's `pages`. Refuses when only one tab remains or when the
 * source tab has no slug (no folder to fold into).
 */
export function demoteTabToGroup(
  config: NavConfig,
  tabIndex: number,
  targetTabIndex: number,
): {config: NavConfig; newPath: Path} {
  if (tabIndex === targetTabIndex) return {config, newPath: [tabIndex]}
  if (config.tabs.length < 2) return {config, newPath: [tabIndex]}
  const source = config.tabs[tabIndex]
  const target = config.tabs[targetTabIndex]
  if (!source || !target) return {config, newPath: [tabIndex]}
  if (!source.slug) return {config, newPath: [tabIndex]}

  const group: GroupRef = {
    group: source.title,
    slug: source.slug,
    pages: source.pages ?? [],
  }
  if (source.icon) group.icon = source.icon
  if (source.tag) group.tag = source.tag
  if (source.defaultOpen) group.expanded = true

  const next = removeAt(config, [tabIndex])
  // After removal, the target's index may have shifted if it came after tabIndex.
  const adjustedTarget = targetTabIndex > tabIndex ? targetTabIndex - 1 : targetTabIndex
  const targetTab = next.tabs[adjustedTarget]
  if (!targetTab) return {config, newPath: [tabIndex]}
  const insertIndex = (targetTab.pages ?? []).length
  const inserted = insertAt(next, [adjustedTarget], insertIndex, group)
  return {config: inserted, newPath: [adjustedTarget, insertIndex]}
}

/** Collect every slug currently used by a tab (including ""). */
export function collectTabSlugs(config: NavConfig): string[] {
  return config.tabs.map(t => t.slug)
}

// ---------------------------------------------------------------------------
// Page icon resolution
// ---------------------------------------------------------------------------
//
// A page's icon can live in three places:
//   1. `PageRef.icon` (config override) — wins when present and non-empty.
//   2. MDX frontmatter `icon:` — the upstream/authored default.
//   3. Nowhere — render the no-icon placeholder.
//
// The editor also needs a way to say "user explicitly removed the icon"
// without losing the underlying frontmatter value. For that we store
// `PageRef.icon === ""` as a clear sentinel: it suppresses display in the
// editor AND tells `apply-nav` to strip the frontmatter `icon:` line on
// the next save.

/** Resolve the icon a page row / inspector should currently display. */
export function resolvePageIcon(
  page: PageRef,
  frontmatterIcons: Record<string, string>,
): string | undefined {
  if (page.icon === "") return undefined // explicit clear
  if (typeof page.icon === "string" && page.icon) return page.icon
  return frontmatterIcons[page.id]
}

/**
 * Build the patch that should be applied to a `PageRef` when the user picks
 * an icon (or chooses "No icon") from the picker. Pages whose frontmatter
 * carries an icon use the `""` sentinel on clear so apply-nav knows to
 * strip the line; pages with no frontmatter icon drop the field entirely.
 */
export function pageIconPatch(
  page: PageRef,
  frontmatterIcons: Record<string, string>,
  picked: string | undefined,
): {icon: string | undefined} {
  if (picked) return {icon: picked}
  const hasFrontmatterIcon = Boolean(frontmatterIcons[page.id])
  return {icon: hasFrontmatterIcon ? "" : undefined}
}

/** Find the path of the entry with the given page id. */
export function findPathById(config: NavConfig, id: string): Path | null {
  for (let t = 0; t < config.tabs.length; t++) {
    const found = recurse(config.tabs[t].pages ?? [], [t])
    if (found) return found
  }
  return null

  function recurse(pages: NavEntry[], prefix: Path): Path | null {
    for (let i = 0; i < pages.length; i++) {
      const entry = pages[i]
      if (isPage(entry) && entry.id === id) return [...prefix, i]
      if (isGroup(entry)) {
        const found = recurse(entry.pages ?? [], [...prefix, i])
        if (found) return found
      }
    }
    return null
  }
}
