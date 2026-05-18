import {NextResponse} from "next/server"
import {spawn} from "node:child_process"
import {promises as fs} from "node:fs"
import path from "node:path"
import type {NavConfig} from "@/lib/nav-types"
import { stableStringify } from "@/lib/stable-stringify"

export const dynamic = "force-dynamic"

const NEXT_ROOT = path.resolve(process.cwd().endsWith("/next") ? process.cwd() : path.join(process.cwd(), "next"))
const APPLY_SCRIPT = path.join(NEXT_ROOT, "scripts", "apply-nav.mjs")
const NAV_CONFIG_PATH = path.join(NEXT_ROOT, "navigation.config.json")
const BACKUP_DIR = path.join(NEXT_ROOT, ".nav-editor-backups")

export async function POST(req: Request) {
  if (process.env.NAV_EDITOR !== "1") return new NextResponse("Not found", {status: 404})

  const body = (await req.json()) as {config: NavConfig; lastSavedAt?: string}

  // Optimistic-concurrency check: refuse to clobber a newer config on disk.
  if (body.lastSavedAt) {
    const stat = await fs.stat(NAV_CONFIG_PATH).catch(() => null)
    if (stat && stat.mtime.toISOString() !== body.lastSavedAt) {
      return NextResponse.json(
        {
          error: "stale",
          message: "navigation.config.json was modified externally; reload before saving.",
        },
        {status: 409},
      )
    }
  }

  await fs.mkdir(BACKUP_DIR, {recursive: true})
  // Backup before overwrite (timestamped).
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    await fs.copyFile(NAV_CONFIG_PATH, path.join(BACKUP_DIR, `navigation.${stamp}.json`)).catch(() => {})
  } catch {
    // ignore
  }

  await fs.writeFile(NAV_CONFIG_PATH, stableStringify(body.config), "utf8")

  // Stream stdout/stderr from apply-nav back as SSE chunks.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const child = spawn(process.execPath, [APPLY_SCRIPT, "--allow-orphans"], {
        cwd: NEXT_ROOT,
        env: {...process.env, NAV_EDITOR: "1"},
      })

      const enqueue = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${data.replace(/\n/g, "\\n")}\n\n`),
        )
      }

      child.stdout.on("data", b => enqueue("stdout", b.toString()))
      child.stderr.on("data", b => enqueue("stderr", b.toString()))
      child.on("close", async code => {
        // Surface the authoritative post-save mtime so the next save call
        // can pass the optimistic-concurrency check without a refresh.
        const stat = await fs.stat(NAV_CONFIG_PATH).catch(() => null)
        const lastSavedAt = stat ? stat.mtime.toISOString() : ""
        enqueue("done", JSON.stringify({code, lastSavedAt}))
        controller.close()
      })
      child.on("error", err => {
        enqueue("stderr", String(err))
        controller.close()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
