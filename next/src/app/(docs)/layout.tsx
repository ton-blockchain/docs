import {source} from "@/lib/source"
import {DocsLayout} from "fumadocs-ui/layouts/docs"
import {baseOptions} from "@/lib/layout.shared"
import {SidebarItemWithTag, SidebarFolderWithTag} from "@/components/SidebarItemWithTag"
import type {ReactNode} from "react"

export default function Layout({children}: {children: ReactNode}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      githubUrl="https://github.com/ton-org/docs"
      sidebar={{
        // Surface top-level folders flagged with `root: true` in their
        // meta.json as Fumadocs tabs. The nav editor controls which folders
        // are roots, so reordering tabs there reflects in the rendered UI.
        // Passing an empty options object enables the default tab transform.
        tabs: {},
        className: "ton-docs-sidebar",
        // Render a tag pill next to pages / external links / folder-backed
        // groups whose `$tag` was stamped by `source.ts`'s page-tree
        // transformer from `nav-overlays.json`. Fumadocs' default meta.json
        // syntax cannot carry tags on links or folders, so we layer them on
        // here.
        components: {
          Item: SidebarItemWithTag,
          Folder: SidebarFolderWithTag,
        },
      }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  )
}
