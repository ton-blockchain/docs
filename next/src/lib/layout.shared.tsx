import type {BaseLayoutProps, LayoutTab, LinkItemType} from "fumadocs-ui/layouts/shared"
import {icons} from "lucide-react"
import {readFileSync} from "node:fs"
import path from "node:path"
import {createElement, type ComponentType, type SVGProps} from "react"
import {ThemeLogo} from "@/components/ThemeLogo"
import type {GroupRef, NavConfig, NavEntry, Tab} from "@/lib/nav-types"
import {isGroup, isLink, isPage} from "@/lib/nav-types"

export const logo = <ThemeLogo />

/**
 * Read `navigation.config.json` synchronously at module load. This runs at
 * build time (and during dev SSR) — the file lives in the project root and
 * is the single source of truth for tabs + header navbar links.
 *
 * Fumadocs' built-in `getLayoutTabs(tree)` ignores the page-tree's Root
 * (it copies `children` but strips the Root's own `root: true` flag, see
 * `loader-*.js`'s `root()` builder), so the "Documentation" tab would
 * never surface in the in-sidebar dropdown or the `tabMode="top"` strip.
 * We build the tabs list ourselves from `navigation.config.json` and pass
 * it explicitly via `<DocsLayout tabs={...}>`.
 */
function readNavConfig(): NavConfig {
  const configPath = path.join(process.cwd(), "navigation.config.json")
  try {
    const raw = readFileSync(configPath, "utf8")
    return JSON.parse(raw) as NavConfig
  } catch {
    return {version: 1, tabs: []}
  }
}

const navConfig = readNavConfig()

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function resolveLucideIcon(name: string | undefined) {
  if (!name) return undefined
  const Comp = (icons as Record<string, ComponentType<SVGProps<SVGSVGElement>>>)[
    toPascalCase(name)
  ]
  if (!Comp) return undefined
  return createElement(Comp)
}

/**
 * Walk a tab's `pages` depth-first and yield every concrete page URL.
 * Used to (a) pick a sensible jump-to URL for the tab and (b) populate
 * `LayoutTab.urls` so Fumadocs can resolve the active tab by pathname
 * even though we're not binding to a `$folder`. External links and groups
 * are walked transparently — groups append their slug to the prefix; links
 * are skipped (a tab click should land on an internal page).
 */
function collectPageUrls(entries: NavEntry[], prefix: string[]): string[] {
  const out: string[] = []
  for (const entry of entries) {
    if (isLink(entry)) continue
    if (isGroup(entry)) {
      const next = (entry as GroupRef).slug ? [...prefix, (entry as GroupRef).slug as string] : prefix
      out.push(...collectPageUrls((entry as GroupRef).pages ?? [], next))
      continue
    }
    if (isPage(entry)) {
      if (entry.slug === "") {
        const joined = prefix.join("/")
        out.push(joined ? `/${joined}` : "/")
        continue
      }
      const leaf = entry.slug ?? entry.id.split("/").pop() ?? entry.id
      out.push(`/${[...prefix, leaf].join("/")}`)
    }
  }
  return out
}

function tabHref(tab: Tab): string {
  const prefix = tab.slug ? [tab.slug] : []
  const [first] = collectPageUrls(tab.pages ?? [], prefix)
  if (first) return first
  return tab.slug ? `/${tab.slug}` : "/"
}

/**
 * Build the explicit `LayoutTab[]` Fumadocs renders in `<DocsLayout tabs={...}>`.
 * Each tab's `urls` set drives `isLayoutTabActive`'s exact-match check, so
 * deep links like `/appkit/get-started/installation/react-app` correctly
 * highlight the AppKit tab.
 */
export function buildLayoutTabs(): LayoutTab[] {
  return navConfig.tabs.map<LayoutTab>(tab => {
    const prefix = tab.slug ? [tab.slug] : []
    const urls = new Set<string>(collectPageUrls(tab.pages ?? [], prefix))
    // Also accept the tab's own jump-to URL even if no page lives there
    // (e.g. a slug-less root with only an index page).
    urls.add(tabHref(tab))
    return {
      url: tabHref(tab),
      title: tab.title,
      icon: resolveLucideIcon(tab.icon),
      urls,
    }
  })
}

/**
 * Header links sourced from `navigation.config.json#navbarLinks`. These are
 * user-curated external URLs surfaced in the top navbar across every
 * layout (docs + home). The tab strip is handled separately by passing
 * `tabs={buildLayoutTabs()}` to `<DocsLayout>`.
 */
function buildLinks(): LinkItemType[] {
  return (navConfig.navbarLinks ?? []).map<LinkItemType>(link => ({
    type: "main",
    text: link.name,
    url: link.url,
    external: true,
    icon: resolveLucideIcon(link.icon),
  }))
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          {logo}
          <span className="text-lg font-semibold tracking-tight">Docs</span>
        </>
      ),
    },
    links: buildLinks(),
  }
}
