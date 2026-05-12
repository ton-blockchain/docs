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

export interface GroupRef {
  group: string
  slug?: string
  icon?: string
  tag?: string
  expanded?: boolean
  /**
   * Sidebar rendering mode for folder-backed groups (`slug` set):
   *   - `true`  -> emit a `---Title---` separator in the parent and inline the
   *               folder's children via the `...slug` extract prefix.
   *   - `false` -> keep as a regular collapsible folder.
   *   - omitted -> default by depth (top-level folder-backed groups inside a
   *                tab flatten; nested groups stay collapsible).
   * Ignored for slug-less groups (they're already separators).
   */
  flatten?: boolean
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
