#!/usr/bin/env node
/**
 * Mintlify → Fumadocs content migration.
 *
 * What it does:
 *   1. Reads the legacy `docs.json` navigation tree.
 *   2. Walks every `.mdx` / `.md` file referenced (and every MDX file under the
 *      mapped root directories), copies it into `next/content/docs/<slug>.mdx`,
 *      preserving the original slug shape so docs.ton.org URLs stay stable.
 *   3. Removes `import { ... } from "/snippets/..."` lines — the components are
 *      now globally registered via `lib/mdx-components.tsx`.
 *   4. Normalises frontmatter (`mode: "custom"`/"wide" → Fumadocs `mode`).
 *   5. Generates one `meta.json` per directory describing the sidebar ordering
 *      and labels (icon, group, expanded) carried over from `docs.json`.
 *   6. Migrates the legacy `redirects` block into `next/redirects.mjs`.
 */
import {promises as fs} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NEXT_ROOT = path.resolve(__dirname, "..")
const REPO_ROOT = path.resolve(NEXT_ROOT, "..")
const CONTENT_OUT = path.join(NEXT_ROOT, "content", "docs")
const DOCS_JSON = path.join(REPO_ROOT, "docs.json")
const REDIRECTS_OUT = path.join(NEXT_ROOT, "redirects.mjs")

const ROOT_FILES = new Set([
  "index", // becomes Next.js landing route
])

const VERBOSE = process.argv.includes("--verbose")
const DRY_RUN = process.argv.includes("--dry-run")

function log(...args) {
  if (VERBOSE) console.log(...args)
}

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8")
  return JSON.parse(raw)
}

async function ensureDir(dir) {
  if (DRY_RUN) return
  await fs.mkdir(dir, {recursive: true})
}

async function writeFile(file, contents) {
  if (DRY_RUN) {
    log("[dry-run] write", path.relative(NEXT_ROOT, file))
    return
  }
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, contents, "utf8")
}

function stripSnippetImports(source) {
  return source
    .replace(/^\s*import\s*\{[^}]*\}\s*from\s*["']\/snippets\/[^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s*\{[^}]*\}\s*from\s*["'][^"']*\/snippets\/[^"']+["'];?\s*$/gm, "")
    .replace(/^(\s*\n){3,}/gm, "\n\n")
}

/**
 * Translate the legacy `::: kind` block-level admonition to the JSX equivalent
 * so the docs stop needing remark-directive — and so colon-pairs like `14:30`
 * never get mis-parsed as inline directives.
 */
function translateAdmonitions(source) {
  // Matches:
  //   :::note Optional title
  //   ...body...
  //   :::
  return source.replace(
    /^:::(note|tip|caution|danger|info|warning|warn)([^\n]*)\n([\s\S]*?)^:::\s*$/gm,
    (_match, kind, header, body) => {
      const trimmed = header.trim()
      const titleAttr = trimmed ? ` title="${trimmed.replace(/"/g, "&quot;")}"` : ""
      const type =
        kind === "note" || kind === "info"
          ? "note"
          : kind === "tip"
            ? "tip"
            : kind === "caution" || kind === "warning" || kind === "warn"
              ? "caution"
              : "danger"
      return `<Aside type="${type}"${titleAttr}>\n\n${body.trimEnd()}\n\n</Aside>`
    },
  )
}

/**
 * Patch frontmatter:
 *   - Map Mintlify `mode: "wide"` → Fumadocs `mode: "wide"` (the schema
 *     accepts it; the page renderer expands the layout when present).
 *   - `mode: "custom"` is dropped — those pages must be rebuilt as native
 *     React routes (currently only `index.mdx`, handled separately).
 */
function patchFrontmatter(source, slug) {
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return source

  let fm = fmMatch[1]

  fm = fm.replace(/^mode:\s*["']custom["']\s*$/m, "")

  fm = fm.replace(/^"og:image":/m, "ogImage:")
  fm = fm.replace(/^"twitter:image":/m, "twitterImage:")

  if (!/^description:/m.test(fm) && !/^title:/m.test(fm)) {
    fm = `title: "${slug}"\n${fm}`
  }

  if (!/^description:/m.test(fm)) {
    fm += '\ndescription: ""'
  }

  return source.replace(/^---\n[\s\S]*?\n---/, `---\n${fm.trim()}\n---`)
}

/**
 * Walk the docs.json navigation. The structure is:
 *   navigation.tabs[].pages[] = string | { group, icon?, expanded?, pages: [...] }
 *
 * Yields a flat list of { slug, group?, icon?, expanded? } entries we can use
 * to (a) emit meta.json files, (b) confirm an .mdx file exists for each slug.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function flattenNav_DEPRECATED(navTabs) {
  const slugs = []
  const groups = new Map()

  function walk(pages, prefix = []) {
    if (!Array.isArray(pages)) return
    for (const entry of pages) {
      if (typeof entry === "string") {
        slugs.push({slug: entry, group: prefix.at(-1)})
        continue
      }

      if (entry && typeof entry === "object" && "group" in entry) {
        const childPages = Array.isArray(entry.pages) ? entry.pages : []
        const dirSegments = childPages[0]
          ? typeof childPages[0] === "string"
            ? childPages[0].split("/").slice(0, -1)
            : []
          : []

        const dirKey = dirSegments.join("/")
        const groupKey = dirKey || entry.openapi?.directory || entry.group

        groups.set(groupKey, {
          name: entry.group,
          icon: entry.icon,
          expanded: entry.expanded ?? false,
          tag: entry.tag,
          openapi: entry.openapi,
          pages: childPages,
        })

        walk(childPages, [...prefix, entry.group])
        continue
      }
    }
  }

  for (const tab of navTabs) {
    walk(tab.pages ?? [])
  }

  return {slugs, groups}
}

async function discoverMdxFiles(root, dir = "") {
  const out = []
  const entries = await fs.readdir(path.join(root, dir), {withFileTypes: true})
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "next") continue
    const rel = path.posix.join(dir, e.name)
    const abs = path.join(root, rel)
    if (e.isDirectory()) {
      out.push(...(await discoverMdxFiles(root, rel)))
    } else if (e.name.endsWith(".mdx")) {
      out.push(rel)
    }
  }
  return out
}

async function migrateFile(repoRel) {
  const slug = repoRel.replace(/\.mdx$/, "")
  if (ROOT_FILES.has(slug)) {
    log("skip root", repoRel, "(rebuilt as app/page.tsx)")
    return null
  }

  const src = await fs.readFile(path.join(REPO_ROOT, repoRel), "utf8")
  const patched = patchFrontmatter(translateAdmonitions(stripSnippetImports(src)), slug)

  const dest = path.join(CONTENT_OUT, repoRel)
  await writeFile(dest, patched)
  return slug
}

/**
 * Build ordered meta.json pages for a directory using `docs.json` as the
 * source of truth. We walk the nav tree, collect the ordered slug list per
 * directory (preserving Mintlify's `group` nesting), then emit each meta.json
 * with the proper `pages` order. Anything in the directory not referenced by
 * `docs.json` is appended at the end alphabetically.
 */
function buildMetaTreeFromNav(navTabs) {
  /** dir -> { name?, icon?, expanded?, pages: string[] } */
  const dirs = new Map()

  function ensureDir(dir, defaults = {}) {
    if (!dirs.has(dir)) dirs.set(dir, {pages: [], ...defaults})
    else if (defaults.name && !dirs.get(dir).name) Object.assign(dirs.get(dir), defaults)
    return dirs.get(dir)
  }

  function walk(pages, currentDir = "", inheritedGroup) {
    if (!Array.isArray(pages)) return
    for (const entry of pages) {
      if (typeof entry === "string") {
        const parts = entry.split("/")
        const fileSlug = parts[parts.length - 1]
        const fileDir = parts.slice(0, -1).join("/")

        if (fileDir === currentDir) {
          const meta = ensureDir(currentDir)
          if (!meta.pages.includes(fileSlug)) meta.pages.push(fileSlug)
        } else {
          // Fallback: place the page in its actual directory.
          const meta = ensureDir(fileDir)
          if (!meta.pages.includes(fileSlug)) meta.pages.push(fileSlug)
        }
        continue
      }

      if (entry && typeof entry === "object" && "group" in entry) {
        const childPages = Array.isArray(entry.pages) ? entry.pages : []
        const groupDir = computeGroupDir(entry, currentDir)

        if (groupDir && groupDir !== currentDir) {
          const parentMeta = ensureDir(currentDir)
          const lastSegment = groupDir
            .slice(currentDir.length === 0 ? 0 : currentDir.length + 1)
            .split("/")[0]
          if (lastSegment && !parentMeta.pages.includes(lastSegment)) {
            parentMeta.pages.push(lastSegment)
          }
        }

        if (groupDir !== currentDir) {
          ensureDir(groupDir, {
            name: entry.group,
            icon: entry.icon,
            expanded: entry.expanded ?? false,
          })
        }

        walk(childPages, groupDir, entry.group)

        if (entry.openapi?.directory) {
          ensureDir(entry.openapi.directory, {
            name: entry.group,
            icon: entry.icon,
          })
        }
      }
    }
  }

  /**
   * Compute the directory that should "own" a given group entry, defined as
   * the longest path prefix shared by every string slug nested in the group.
   *
   * Examples:
   *   group "Ecosystem" containing "ecosystem/ai/mcp" + "ecosystem/oracles/*"
   *     → "ecosystem"
   *   group "API v3" containing "ecosystem/api/toncenter/v3/overview" only
   *     → "ecosystem/api/toncenter/v3"
   */
  function computeGroupDir(entry, fallback) {
    const slugs = []
    function collect(node) {
      if (typeof node === "string") {
        slugs.push(node)
        return
      }
      if (node && typeof node === "object") {
        for (const child of node.pages ?? []) collect(child)
      }
    }
    for (const p of entry.pages ?? []) collect(p)
    if (entry.openapi?.directory) slugs.push(`${entry.openapi.directory}/_`)

    if (slugs.length === 0) return fallback

    const parts = slugs.map(s => s.split("/"))
    const minLen = Math.min(...parts.map(p => p.length - 1))
    const prefix = []
    for (let i = 0; i < minLen; i++) {
      const segment = parts[0][i]
      if (parts.every(p => p[i] === segment)) prefix.push(segment)
      else break
    }
    return prefix.join("/") || fallback
  }

  for (const tab of navTabs) walk(tab.pages ?? [])

  return dirs
}

async function appendMissingChildren(metaDirs) {
  // Walk the filesystem and ensure every .mdx file / subdirectory shows up in
  // its parent meta.json. Missing entries get appended in alphabetical order.
  async function walk(dir) {
    const abs = path.join(CONTENT_OUT, dir)
    let entries
    try {
      entries = await fs.readdir(abs, {withFileTypes: true})
    } catch {
      return
    }
    const fsFiles = []
    const fsSubdirs = []
    for (const entry of entries) {
      if (entry.name === "meta.json") continue
      if (entry.isDirectory()) {
        fsSubdirs.push(entry.name)
        await walk(path.posix.join(dir, entry.name))
      } else if (entry.name.endsWith(".mdx")) {
        fsFiles.push(entry.name.replace(/\.mdx$/, ""))
      }
    }

    if (fsFiles.length === 0 && fsSubdirs.length === 0) return
    if (!metaDirs.has(dir)) metaDirs.set(dir, {pages: []})

    const meta = metaDirs.get(dir)
    const existing = new Set(meta.pages)

    for (const name of [...fsFiles, ...fsSubdirs].sort()) {
      if (!existing.has(name)) meta.pages.push(name)
    }
  }

  await walk("")
}

async function emitMetaTree(navTabs) {
  const metaDirs = buildMetaTreeFromNav(navTabs)
  await appendMissingChildren(metaDirs)

  for (const [dir, info] of metaDirs) {
    if (info.pages.length === 0) continue
    const meta = {
      title: info.name,
      icon: info.icon,
      defaultOpen: info.expanded ?? false,
      pages: info.pages,
    }
    if (!meta.title) delete meta.title
    if (!meta.icon) delete meta.icon
    if (!meta.defaultOpen) delete meta.defaultOpen

    const target = path.join(CONTENT_OUT, dir, "meta.json")
    await writeFile(target, JSON.stringify(meta, null, 2) + "\n")
  }
}

async function migrateRedirects(docs) {
  const entries = (docs.redirects ?? []).map(r => ({
    source: r.source,
    destination: r.destination,
    permanent: r.permanent ?? true,
  }))

  const body = `/**
 * Auto-generated from \`docs.json\` redirects on ${new Date().toISOString()}.
 * Re-run \`node next/scripts/migrate-content.mjs\` to regenerate.
 *
 * @type {Array<{source: string, destination: string, permanent?: boolean}>}
 */
export const redirects = ${JSON.stringify(entries, null, 2)}
`
  await writeFile(REDIRECTS_OUT, body)
  console.log(`  redirects: ${entries.length} entries`)
}

async function main() {
  console.log(`Migrating Mintlify content from ${REPO_ROOT} → ${path.relative(REPO_ROOT, CONTENT_OUT)}`)
  if (DRY_RUN) console.log("(dry-run — no files will be written)")

  const docs = await readJson(DOCS_JSON)

  const allMdx = await discoverMdxFiles(REPO_ROOT)
  console.log(`  discovered: ${allMdx.length} .mdx files`)

  let migrated = 0
  for (const rel of allMdx) {
    if (rel.startsWith("next/")) {
      log("skip", rel)
      continue
    }
    const slug = await migrateFile(rel)
    if (slug) migrated++
  }
  console.log(`  migrated: ${migrated} pages`)

  await emitMetaTree(docs.navigation?.tabs ?? [])
  await migrateRedirects(docs)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
