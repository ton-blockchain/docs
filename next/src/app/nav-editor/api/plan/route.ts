import {NextResponse} from "next/server"
import {spawn} from "node:child_process"
import {promises as fs} from "node:fs"
import path from "node:path"
import {stableStringify} from "@/lib/nav-config"
import type {NavConfig} from "@/lib/nav-types"

export const dynamic = "force-dynamic"

const NEXT_ROOT = path.resolve(process.cwd().endsWith("/next") ? process.cwd() : path.join(process.cwd(), "next"))
const APPLY_SCRIPT = path.join(NEXT_ROOT, "scripts", "apply-nav.mjs")
const NAV_CONFIG_PATH = path.join(NEXT_ROOT, "navigation.config.json")

export async function POST(req: Request) {
  if (process.env.NAV_EDITOR !== "1") return new NextResponse("Not found", {status: 404})
  const body = (await req.json()) as {config: NavConfig}
  const tmpPath = path.join(NEXT_ROOT, `.nav-editor-plan-${Date.now()}.json`)
  const backupPath = path.join(NEXT_ROOT, `.nav-editor-prev-${Date.now()}.json`)

  // Snapshot the original file (content + mtime) so the dry-run leaves no
  // observable trace on disk. `fs.copyFile` bumps the destination's mtime,
  // so we restore both [content] and [atime, mtime] in the finally block.
  const originalStat = await fs.stat(NAV_CONFIG_PATH).catch(() => null)
  if (originalStat) {
    await fs.copyFile(NAV_CONFIG_PATH, backupPath).catch(() => undefined)
  }

  let output = ""
  try {
    await fs.writeFile(NAV_CONFIG_PATH, stableStringify(body.config), "utf8")
    await fs.writeFile(tmpPath, "", "utf8")

    await new Promise<void>(resolve => {
      const child = spawn(process.execPath, [APPLY_SCRIPT, "--dry-run", "--allow-orphans"], {
        cwd: NEXT_ROOT,
        env: {...process.env, NAV_EDITOR: "1"},
      })
      child.stdout.on("data", b => (output += b.toString()))
      child.stderr.on("data", b => (output += b.toString()))
      child.on("close", () => resolve())
    })
  } finally {
    if (originalStat) {
      await fs.copyFile(backupPath, NAV_CONFIG_PATH).catch(() => undefined)
      await fs
        .utimes(NAV_CONFIG_PATH, originalStat.atime, originalStat.mtime)
        .catch(() => undefined)
      await fs.unlink(backupPath).catch(() => undefined)
    } else {
      await fs.unlink(NAV_CONFIG_PATH).catch(() => undefined)
    }
    await fs.unlink(tmpPath).catch(() => undefined)
  }

  const moves = parseMoves(output)
  return NextResponse.json({moves, output})
}

function parseMoves(out: string): Array<{from: string; to: string}> {
  const moves: Array<{from: string; to: string}> = []
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*([a-z0-9/_-]+)\s+->\s+([a-z0-9/_-]+)\s*$/i)
    if (m) moves.push({from: m[1], to: m[2]})
  }
  return moves
}
