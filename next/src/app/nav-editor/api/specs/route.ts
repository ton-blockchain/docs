import {promises as fs} from "node:fs"
import path from "node:path"
import {NextResponse} from "next/server"

export const dynamic = "force-dynamic"

const NEXT_ROOT = path.resolve(
  process.cwd().endsWith("/next") ? process.cwd() : path.join(process.cwd(), "next"),
)
const SPEC_ROOTS = [
  path.resolve(NEXT_ROOT, "..", "docs"),
  path.resolve(NEXT_ROOT, "..", "openapi"),
  path.resolve(NEXT_ROOT, "..", "apis"),
]

/**
 * GET /nav-editor/api/specs
 *
 * Returns a flat list of repo-relative paths to OpenAPI specs (yaml/yml/json)
 * found under the upstream `docs/`, `openapi/`, and `apis/` directories. The
 * inspector uses this to populate a datalist for the `OpenAPI source` field
 * on pages and groups.
 */
export async function GET() {
  if (process.env.NAV_EDITOR !== "1") {
    return new NextResponse("Not found", {status: 404})
  }
  const repoRoot = path.resolve(NEXT_ROOT, "..")
  const out: string[] = []
  await Promise.all(SPEC_ROOTS.map(root => walk(root)))
  out.sort()
  return NextResponse.json({specs: out})

  async function walk(root: string) {
    try {
      const stat = await fs.stat(root)
      if (!stat.isDirectory()) return
    } catch {
      return
    }
    await walkInner(root)
  }

  async function walkInner(abs: string) {
    let entries: import("node:fs").Dirent[]
    try {
      entries = await fs.readdir(abs, {withFileTypes: true})
    } catch {
      return
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue
      if (ent.name === "node_modules") continue
      const full = path.join(abs, ent.name)
      if (ent.isDirectory()) {
        await walkInner(full)
      } else if (ent.isFile()) {
        if (!/\.(ya?ml|json)$/i.test(ent.name)) continue
        const rel = path.relative(repoRoot, full)
        // Heuristic: only include files whose first 4KiB mentions "openapi" or
        // "swagger" to keep the list small.
        try {
          const fd = await fs.open(full, "r")
          const buf = Buffer.alloc(4096)
          const {bytesRead} = await fd.read(buf, 0, buf.length, 0)
          await fd.close()
          const head = buf.slice(0, bytesRead).toString("utf8").toLowerCase()
          if (head.includes("openapi") || head.includes("swagger")) out.push(rel)
        } catch {
          // skip unreadable
        }
      }
    }
  }
}
