/**
 * TypeScript mirror of the runtime schema declared in
 * `next/scripts/nav-config.mjs`. The two files must stay in sync; the JSON
 * file `navigation.config.json` is the only persistent source of truth.
 */

export interface OpenApiRef {
  source: string
  directory?: string
}

export interface PageRef {
  id: string
  slug?: string
  title?: string
  icon?: string
  tag?: string
  openapi?: OpenApiRef
}

export type GroupMode = "flatten" | "section" | "folder"

export interface GroupRef {
  group: string
  slug?: string
  icon?: string
  tag?: string
  expanded?: boolean
  /**
   * Legacy two-state mode for folder-backed groups (`slug` set):
   *   - `true`  -> equivalent to `mode: "flatten"`.
   *   - `false` -> equivalent to `mode: "folder"`.
   *   - omitted -> deferred to `mode` (or the default heuristic).
   * Kept for backwards compatibility with existing configs.
   */
  flatten?: boolean
  /**
   * Fine-grained sidebar rendering mode for folder-backed groups:
   *   - `flatten` -> emit `---Title---` + `...slug` in the parent; children
   *                  inline as siblings of the parent at the same depth.
   *   - `section` -> emit the folder reference + mark the folder's meta with
   *                  `collapsible: false`. `SidebarFolderWithTag` renders the
   *                  trigger like a separator (non-clickable, uppercase).
   *                  Children stay nested under the header.
   *   - `folder`  -> regular collapsible folder.
   *
   * Default (when neither `mode` nor `flatten` is set): top-level-in-tab
   * groups default to `flatten`; sub-groups whose `pages` include a
   * `slug: ""` "intro" page default to `section`; everything else defaults
   * to `folder`.
   *
   * Ignored for slug-less groups (they're already separators).
   */
  mode?: GroupMode
  openapi?: OpenApiRef
  pages: NavEntry[]
}

export interface LinkRef {
  type: "link"
  name: string
  url: string
  icon?: string
  tag?: string
}

export type NavEntry = PageRef | GroupRef | LinkRef

export interface Tab {
  id: string
  slug: string
  title: string
  icon?: string
  tag?: string
  defaultOpen?: boolean
  pages: NavEntry[]
}

export interface NavConfig {
  version: 1
  tabs: Tab[]
  /**
   * Optional flat list of outbound URLs rendered as top-bar header links.
   * Independent of `tabs`; the in-sidebar tab strip is unaffected.
   * Managed through the nav editor's "Header navbar links" panel.
   */
  navbarLinks?: LinkRef[]
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isLink(entry: unknown): entry is LinkRef {
  return typeof entry === "object" && entry !== null && (entry as {type?: unknown}).type === "link"
}

export function isGroup(entry: unknown): entry is GroupRef {
  return (
    typeof entry === "object" && entry !== null && "group" in entry && !isLink(entry)
  )
}

export function isPage(entry: unknown): entry is PageRef {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    !isLink(entry) &&
    !isGroup(entry)
  )
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Return the canonical URL slug for a given page id, or undefined if the id
 * isn't referenced anywhere in the config. Mirrors `resolveCurrentSlug` in
 * `nav-config.mjs`.
 */
export function resolveCurrentSlug(targetId: string, config: NavConfig): string | undefined {
  for (const tab of config.tabs ?? []) {
    const prefix = tab.slug ? [tab.slug] : []
    const found = walkAndFind(tab.pages ?? [], targetId, prefix)
    if (found !== undefined) return found
  }
  return undefined
}

function walkAndFind(
  pages: NavEntry[],
  targetId: string,
  prefix: string[],
): string | undefined {
  for (const entry of pages) {
    if (isLink(entry)) continue
    if (isGroup(entry)) {
      const next = entry.slug ? [...prefix, entry.slug] : prefix
      const found = walkAndFind(entry.pages ?? [], targetId, next)
      if (found !== undefined) return found
    } else if (isPage(entry)) {
      if (entry.id === targetId) {
        const leaf = entry.slug ?? entry.id.split("/").pop() ?? entry.id
        return [...prefix, leaf].join("/")
      }
    }
  }
  return undefined
}

/**
 * Walk every page in the config, calling `visitor` for each leaf.
 */
export function walkPages(
  config: NavConfig,
  visitor: (page: PageRef, slug: string, parent: GroupRef | Tab, slugParts: string[]) => void,
): void {
  for (const tab of config.tabs ?? []) {
    const prefix = tab.slug ? [tab.slug] : []
    walkInner(tab.pages ?? [], prefix, tab, visitor)
  }
}

function walkInner(
  pages: NavEntry[],
  prefix: string[],
  parent: GroupRef | Tab,
  visitor: (page: PageRef, slug: string, parent: GroupRef | Tab, slugParts: string[]) => void,
): void {
  for (const entry of pages) {
    if (isLink(entry)) continue
    if (isGroup(entry)) {
      const next = entry.slug ? [...prefix, entry.slug] : prefix
      walkInner(entry.pages ?? [], next, entry, visitor)
    } else if (isPage(entry)) {
      const leaf = entry.slug ?? entry.id.split("/").pop() ?? entry.id
      const parts = [...prefix, leaf]
      visitor(entry, parts.join("/"), parent, parts)
    }
  }
}

export function collectReferencedIds(config: NavConfig): Set<string> {
  const ids = new Set<string>()
  walkPages(config, page => ids.add(page.id))
  return ids
}

// ---------------------------------------------------------------------------
// Group mode resolution (mirror of `resolveGroupMode` in scripts/apply-nav.mjs)
// ---------------------------------------------------------------------------

/**
 * Resolve how a folder-backed group should render in the sidebar. Mirrors the
 * helper in `scripts/apply-nav.mjs`; keep the two in sync.
 *
 * Precedence:
 *   1. `group.mode` (explicit, fine-grained).
 *   2. `group.flatten` (legacy boolean): `true` → `flatten`, `false` → `folder`.
 *   3. Heuristic: top-level-in-tab → `flatten`; sub-group with an intro page
 *      (a `PageRef` whose `slug === ""`) → `section`; everything else → `folder`.
 */
export function resolveGroupMode(
  group: GroupRef,
  ctx: {isTopLevelInTab: boolean},
): GroupMode {
  if (group.mode === "flatten" || group.mode === "section" || group.mode === "folder") {
    return group.mode
  }
  if (group.flatten === true) return "flatten"
  if (group.flatten === false) return "folder"
  if (ctx.isTopLevelInTab) return "flatten"
  const hasIntroPage = (group.pages ?? []).some(p => isPage(p) && p.slug === "")
  return hasIntroPage ? "section" : "folder"
}
