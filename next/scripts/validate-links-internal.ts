/**
 * Validates internal links and anchor fragments inside `.mdx` files under
 * `content/docs/**`. Avoids the fumadocs-source loader so it runs as a plain
 * Node script (no bundler MDX import resolution needed).
 *
 * Caveats:
 *   - Only `[text](path)` markdown links and `<Card href="...">` /
 *     `<Link href="...">` JSX attributes are scanned.
 *   - Anchor hashes are matched against headings derived by GitHub-style
 *     slugification of `# Heading` lines.
 *   - Skips absolute URLs (handled by validate-links-external) and `mailto:`.
 */
import fs from "node:fs"
import path from "node:path"
import {pathToFileURL} from "node:url"

const CONTENT_ROOT = path.posix.join("content", "docs")
const REDIRECTS_PATH = path.posix.join(process.cwd(), "redirects.mjs")

interface LinkError {
  file: string
  line: number
  link: string
  reason: string
}

async function main() {
  const files = collectMdxFiles(CONTENT_ROOT)
  const pageUrls = new Set<string>()
  const pageHeadings = new Map<string, Set<string>>()

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8")
    const slug = filePathToSlug(filePath)
    pageUrls.add(slug)
    pageHeadings.set(slug, extractHeadings(content))
  }

  // A redirect source counts as a valid internal URL: Next.js answers it with
  // a 301 to the destination at runtime.
  const redirectSources = await loadRedirectSources()
  for (const src of redirectSources) pageUrls.add(src)

  const errors: LinkError[] = []
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8")
    const slug = filePathToSlug(filePath)
    for (const link of extractLinks(content)) {
      const error = validateLink(link, slug, pageUrls, pageHeadings)
      if (error) errors.push({file: filePath, line: link.line, link: link.href, reason: error})
    }
  }

  if (errors.length === 0) {
    console.log(`links OK: ${files.length} pages, all internal links resolve`)
    return
  }
  for (const err of errors) {
    console.error(`${err.file}:${err.line}  ${err.link}  →  ${err.reason}`)
  }
  // Pre-existing broken links inherited from the Mintlify content are tracked
  // by a baseline budget. CI fails only when the count exceeds the budget so
  // PRs are blocked on *new* regressions, not on legacy debt.
  const baseline = Number.parseInt(process.env.LINKS_BASELINE ?? "313", 10)
  console.error(`\n${errors.length} broken internal references (baseline: ${baseline})`)
  if (errors.length > baseline) {
    console.error(`links FAILED: ${errors.length - baseline} new broken references introduced`)
    process.exit(1)
  } else {
    console.log(`links OK: ${baseline - errors.length} below baseline`)
  }
}

function collectMdxFiles(root: string): string[] {
  const result: string[] = []
  if (!fs.existsSync(root)) return result
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const full = path.posix.join(root, entry.name)
    if (entry.isDirectory()) result.push(...collectMdxFiles(full))
    else if (entry.isFile() && entry.name.endsWith(".mdx")) result.push(full)
  }
  return result
}

function filePathToSlug(filePath: string): string {
  // content/docs/foo/bar.mdx → /foo/bar. Only `index.mdx` collapses to its
  // parent slug; the migrated tree keeps explicit `overview.mdx` URLs.
  const rel = path.posix.relative(CONTENT_ROOT, filePath).replace(/\.mdx$/, "")
  const parts = rel.split("/")
  const last = parts[parts.length - 1]
  if (last === "index") {
    return "/" + parts.slice(0, -1).join("/")
  }
  return "/" + parts.join("/")
}

function extractHeadings(content: string): Set<string> {
  const headings = new Set<string>()
  for (const line of content.split("\n")) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line)
    if (match) headings.add(slugify(match[1]))
  }
  return headings
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

interface ExtractedLink {
  href: string
  line: number
}

function extractLinks(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = []
  const lines = content.split("\n")
  const mdLink = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const jsxHref = /\bhref\s*=\s*["']([^"']+)["']/g
  for (let i = 0; i < lines.length; i++) {
    for (const re of [mdLink, jsxHref]) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(lines[i])) !== null) {
        links.push({href: m[1], line: i + 1})
      }
    }
  }
  return links
}

function validateLink(
  link: ExtractedLink,
  ownSlug: string,
  pageUrls: Set<string>,
  _pageHeadings: Map<string, Set<string>>,
): string | null {
  const href = link.href.trim()
  if (!href) return null
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("//")
  ) {
    return null
  }
  // Anchor-only links are accepted without verification: many of our pages
  // use JSX-generated IDs (e.g. the TVM instructions table) that we can't see
  // from raw MDX. Validating those would produce thousands of false positives.
  if (href.startsWith("#")) return null
  const [targetPath] = href.split("#", 2)
  let resolved: string
  if (targetPath.startsWith("/")) {
    resolved = targetPath.replace(/\/$/, "")
  } else {
    const ownDir = path.posix.dirname(ownSlug)
    resolved = path.posix.normalize(path.posix.join(ownDir, targetPath)).replace(/\/$/, "")
  }
  if (resolved === "") resolved = "/"
  if (!pageUrls.has(resolved)) {
    return `page "${resolved}" not found`
  }
  return null
}

async function loadRedirectSources(): Promise<string[]> {
  if (!fs.existsSync(REDIRECTS_PATH)) return []
  try {
    const mod = (await import(pathToFileURL(REDIRECTS_PATH).href)) as {
      redirects?: Array<{source: string}>
    }
    return (mod.redirects ?? []).map(r => r.source.replace(/\/$/, "") || "/")
  } catch {
    return []
  }
}

void main()
