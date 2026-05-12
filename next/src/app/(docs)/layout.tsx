import {source} from "@/lib/source"
import {DocsLayout} from "fumadocs-ui/layouts/docs"
import {baseOptions, buildLayoutTabs} from "@/lib/layout.shared"
import {SidebarItemWithTag, SidebarFolderWithTag} from "@/components/SidebarItemWithTag"
import type {ReactNode} from "react"

export default function Layout({children}: {children: ReactNode}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      githubUrl="https://github.com/ton-org/docs"
      // Render every tab from `navigation.config.json` as a horizontal
      // strip above the page content on every docs page. We pass `tabs`
      // explicitly because Fumadocs' auto `getLayoutTabs(tree)` ignores
      // the page-tree Root's own `root: true` (the "Documentation" tab),
      // so the auto path would only ever surface AppKit.
      tabMode="top"
      tabs={buildLayoutTabs()}
      // The built-in LayoutTabs strip is hardcoded to `[grid-area:main]`,
      // the same cell as the article. We carve out a dedicated `tabs` row
      // here, between `header` and `toc-popover`, so the strip appears
      // above the mobile/tablet TOC summary. A CSS rule in `globals.css`
      // retargets the strip into the new row and we bump `--fd-docs-row-2`
      // (which `toc-popover` is sticky to) by `--fd-tabs-height` so the
      // TOC summary doesn't slide under the strip when scrolled.
      containerProps={{
        style: {
          gridTemplate: `"sidebar sidebar header toc toc"
"sidebar sidebar tabs toc toc" auto
"sidebar sidebar toc-popover toc toc"
"sidebar sidebar main toc toc" 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          ["--fd-docs-row-2" as string]:
            "calc(var(--fd-banner-height, 0px) + var(--fd-header-height) + var(--fd-tabs-height, 0px))",
        },
      }}
      sidebar={{
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
      // `baseOptions().links` projects every tab as a `LinkItemType` for
      // the home page navbar. Docs pages already surface the same items
      // via the tab strip, so blank `links` here keeps the docs sidebar
      // header from duplicating them.
      links={[]}
    >
      {children}
    </DocsLayout>
  )
}
