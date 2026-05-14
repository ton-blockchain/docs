import {notFound} from "next/navigation"
import {loadEditorState} from "./_lib/load-state"
import {NavEditor} from "./_components/nav-editor.client"

export const dynamic = "force-dynamic"

export default async function NavEditorPage() {
  if (process.env.NAV_EDITOR !== "1") notFound()
  const state = await loadEditorState()
  return <NavEditor initial={state} />
}
