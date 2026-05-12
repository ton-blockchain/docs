import {promises as fs} from "node:fs"
import path from "node:path"
import type {NavConfig} from "@/lib/nav-types"
import {collectReferencedIds, getEffectiveTabs} from "@/lib/nav-types"

/**
 * Locate the `next/` workspace root no matter where Node is started.
 */
const NEXT_ROOT = path.resolve(process.cwd().endsWith("/next") ? process.cwd() : path.join(process.cwd(), "next"))
const CONTENT_ROOT = path.join(NEXT_ROOT, "content", "docs")
const NAV_CONFIG_PATH = path.join(NEXT_ROOT, "navigation.config.json")

export interface EditorState {
  config: NavConfig
  allSlugs: string[]
  orphans: string[]
  lastSavedAt: string
  titles: Record<string, string>
  /**
   * Frontmatter `icon:` values harvested from every .mdx, keyed by both the
   * on-disk slug AND the immutable id (when present and different). The
   * editor uses this as a fallback so a page renders its real icon even
   * when the navigation config carries no explicit override.
   */
  icons: Record<string, string>
}

export async function loadEditorState(): Promise<EditorState> {
  const config = await readConfig()
  const allSlugs = await listMdxSlugs()
  const {titles, icons} = await readFrontmatter(allSlugs)
  const referenced = collectReferencedIds(config)
  const orphans = allSlugs.filter(s => !referenced.has(s)).sort()
  const stat = await fs.stat(NAV_CONFIG_PATH).catch(() => null)
  return {
    config,
    allSlugs,
    orphans,
    // Empty string means "no on-disk file yet"; the save route's
    // optimistic-concurrency check treats it as "no expectation".
    lastSavedAt: stat ? stat.mtime.toISOString() : "",
    titles,
    icons,
  }
}

async function readConfig(): Promise<NavConfig> {
  let raw: NavConfig
  try {
    const text = await fs.readFile(NAV_CONFIG_PATH, "utf8")
    raw = JSON.parse(text) as NavConfig
  } catch {
    return {version: 1, tabs: []}
  }
  // Fold any legacy `navbarLinks` into `tabs[]` as ExternalTab entries
  // before the editor sees the config, so the panel and main tree both
  // operate on a single ordered list. Persisted on the next save.
  if (raw.navbarLinks && raw.navbarLinks.length > 0) {
    const tabs = getEffectiveTabs(raw)
    const next: NavConfig = {...raw, tabs}
    delete next.navbarLinks
    return next
  }
  return raw
}

async function listMdxSlugs(): Promise<string[]> {
  const out: string[] = []
  await walk("")
  out.sort()
  return out

  async function walk(rel: string) {
    let entries
    try {
      entries = await fs.readdir(path.join(CONTENT_ROOT, rel), {withFileTypes: true})
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const child = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(child)
      } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        out.push(child.replace(/\.mdx$/, ""))
      }
    }
  }
}

/**
 * Slurp top-level frontmatter scalars (title, icon, id) from every .mdx in
 * parallel batches. Results are double-indexed by on-disk slug AND by id (when
 * id is present and differs) so editor lookups via either key succeed —
 * pages whose canonical URL has drifted from their immutable id still
 * surface their real frontmatter values.
 */
async function readFrontmatter(slugs: string[]): Promise<{
  titles: Record<string, string>
  icons: Record<string, string>
}> {
  const titles: Record<string, string> = {}
  const icons: Record<string, string> = {}
  const batch = 32
  for (let i = 0; i < slugs.length; i += batch) {
    const chunk = slugs.slice(i, i + batch)
    await Promise.all(
      chunk.map(async slug => {
        try {
          const raw = await fs.readFile(path.join(CONTENT_ROOT, `${slug}.mdx`), "utf8")
          const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
          if (!fmMatch) return
          const fm = fmMatch[1]
          const id = matchScalar(fm, "id")
          const title = matchScalar(fm, "title")
          const icon = matchScalar(fm, "icon")
          if (title) {
            titles[slug] = title
            if (id && id !== slug) titles[id] = title
          }
          if (icon) {
            icons[slug] = icon
            if (id && id !== slug) icons[id] = icon
          }
        } catch {
          // ignore unreadable files
        }
      }),
    )
  }
  return {titles, icons}
}

function matchScalar(fm: string, key: string): string | undefined {
  const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(\\S.*?))\\s*$`, "m")
  const m = fm.match(re)
  const value = m?.[1] ?? m?.[2] ?? m?.[3]
  return value ? value.trim() : undefined
}
