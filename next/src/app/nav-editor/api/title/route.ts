import {NextResponse} from "next/server"
import {promises as fs} from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

const NEXT_ROOT = path.resolve(process.cwd().endsWith("/next") ? process.cwd() : path.join(process.cwd(), "next"))
const CONTENT_ROOT = path.join(NEXT_ROOT, "content", "docs")

export async function GET(req: Request) {
  if (process.env.NAV_EDITOR !== "1") return new NextResponse("Not found", {status: 404})
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug")
  if (!slug) return NextResponse.json({title: null})
  try {
    const raw = await fs.readFile(path.join(CONTENT_ROOT, `${slug}.mdx`), "utf8")
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) return NextResponse.json({title: null})
    const titleMatch = fmMatch[1].match(/^title:\s*(?:"([^"]*)"|'([^']*)'|(\S.*?))\s*$/m)
    const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3])?.trim() ?? null
    return NextResponse.json({title})
  } catch {
    return NextResponse.json({title: null})
  }
}
