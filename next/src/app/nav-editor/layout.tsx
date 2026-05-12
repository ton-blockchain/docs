import type {ReactNode} from "react"

export const metadata = {
  title: "Nav editor",
  robots: "noindex,nofollow",
}

export default function NavEditorLayout({children}: {children: ReactNode}) {
  return <div className="nav-editor-root h-screen overflow-hidden bg-fd-background text-fd-foreground">{children}</div>
}
