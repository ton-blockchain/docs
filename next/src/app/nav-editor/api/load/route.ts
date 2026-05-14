import {NextResponse} from "next/server"
import {loadEditorState} from "../../_lib/load-state"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NAV_EDITOR !== "1") return new NextResponse("Not found", {status: 404})
  const state = await loadEditorState()
  return NextResponse.json(state)
}
