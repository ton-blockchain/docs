"use client"
import {ArrowUpToLine, FolderInput} from "lucide-react"
import {useEffect, useRef, useState} from "react"
import type {
  ExternalTab,
  GroupMode,
  GroupRef,
  InternalTab,
  LinkRef,
  NavConfig,
  NavEntry,
  OpenApiRef,
  PageRef,
  Tab,
} from "@/lib/nav-types"
import {
  isExternalTab,
  isGroup,
  isInternalTab,
  isLink,
  isPage,
  resolveGroupMode,
} from "@/lib/nav-types"
import {
  type Path,
  convertTabToExternal,
  convertTabToInternal,
  demoteTabToGroup,
  getAt,
  pageCanonicalUrl,
  pageIconPatch,
  promoteToTab,
  removeAt,
  resolvePageIcon,
  updateAt,
} from "../_lib/tree-ops"
import {IconRender} from "./icon-render"
import {IconPicker} from "./icon-picker"

/**
 * Lazily-loaded list of OpenAPI specs (from /api/specs). Populated on first
 * use; shared across all inspectors.
 */
function useSpecsList() {
  const [specs, setSpecs] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/nav-editor/api/specs")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d?.specs) setSpecs(d.specs as string[])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  return specs ?? []
}

export function Inspector({
  config,
  selected,
  onUpdate,
  onSelect,
  titles,
  icons,
}: {
  config: NavConfig
  selected: Path | null
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onSelect: (path: Path | null) => void
  titles: Record<string, string>
  icons: Record<string, string>
}) {
  if (!selected) {
    return (
      <aside className="flex h-full w-[340px] flex-col border-l border-fd-border bg-fd-card/30 p-4 text-sm text-fd-muted-foreground">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">Inspector</h3>
        <p>Select an entry on the left to edit its properties.</p>
      </aside>
    )
  }
  const entry = getAt(config, selected)
  if (!entry) return null

  if (selected.length === 1) {
    return (
      <TabInspector
        config={config}
        path={selected}
        tab={entry as Tab}
        onUpdate={onUpdate}
        onDelete={() => {
          onUpdate(removeAt(config, selected), null)
          onSelect(null)
        }}
      />
    )
  }

  const navEntry = entry as NavEntry
  if (isLink(navEntry)) {
    return (
      <LinkInspector
        config={config}
        path={selected}
        link={navEntry}
        onUpdate={onUpdate}
        onDelete={() => {
          onUpdate(removeAt(config, selected), null)
          onSelect(null)
        }}
      />
    )
  }
  if (isGroup(navEntry)) {
    return (
      <GroupInspector
        config={config}
        path={selected}
        group={navEntry}
        onUpdate={onUpdate}
        onDelete={() => {
          onUpdate(removeAt(config, selected), null)
          onSelect(null)
        }}
      />
    )
  }
  if (isPage(navEntry)) {
    return (
      <PageInspector
        config={config}
        path={selected}
        page={navEntry}
        onUpdate={onUpdate}
        onDelete={() => {
          onUpdate(removeAt(config, selected), null)
          onSelect(null)
        }}
        titles={titles}
        icons={icons}
      />
    )
  }
  return null
}

function shellClass() {
  return "flex h-full w-[340px] flex-col border-l border-fd-border bg-fd-card/30 p-4 text-sm"
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-fd-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-fd-muted-foreground">{hint}</span>}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-fd-border bg-fd-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40 ${props.className ?? ""}`}
    />
  )
}

function CheckInput({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="mb-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {hint && <span className="mt-1 ml-6 block text-[11px] text-fd-muted-foreground">{hint}</span>}
    </div>
  )
}

function IconField({
  value,
  source,
  onChange,
}: {
  value: string | undefined
  /**
   * Where the displayed icon is coming from. `frontmatter` shows a subtle
   * hint so the user knows the icon is inherited from the MDX file and that
   * clicking "clear" will strip it from the .mdx on save.
   */
  source?: "override" | "frontmatter"
  onChange: (next: string | undefined) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  return (
    <>
      <Field
        label="Icon"
        hint={
          value && source === "frontmatter"
            ? "Inherited from MDX frontmatter. Clearing removes it from the file."
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          <button
            ref={ref}
            type="button"
            onClick={() => {
              setRect(ref.current?.getBoundingClientRect() ?? null)
              setOpen(true)
            }}
            className="flex h-7 w-7 items-center justify-center rounded border border-fd-border bg-fd-background hover:bg-fd-accent"
          >
            <IconRender name={value} size={16} />
          </button>
          {value && (
            <code className="rounded bg-fd-muted/40 px-1.5 py-0.5 text-xs">{value}</code>
          )}
          {value && source === "frontmatter" && (
            <span className="text-[10px] uppercase tracking-wide text-fd-muted-foreground">
              frontmatter
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-fd-muted-foreground hover:text-fd-foreground"
            >
              clear
            </button>
          )}
        </div>
      </Field>
      <IconPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={onChange}
        anchorRect={rect}
      />
    </>
  )
}

function TabInspector({
  config,
  path,
  tab,
  onUpdate,
  onDelete,
}: {
  config: NavConfig
  path: Path
  tab: Tab
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
}) {
  if (isExternalTab(tab)) {
    return (
      <ExternalTabInspector
        config={config}
        path={path}
        tab={tab}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    )
  }
  return (
    <InternalTabInspector
      config={config}
      path={path}
      tab={tab}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}

function InternalTabInspector({
  config,
  path,
  tab,
  onUpdate,
  onDelete,
}: {
  config: NavConfig
  path: Path
  tab: InternalTab
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
}) {
  const tabIndex = path[0]
  const internalSiblings = config.tabs.filter(isInternalTab)
  const canDemote = internalSiblings.length > 1 && Boolean(tab.slug)
  const demoteTargets = canDemote
    ? config.tabs
        .map((t, i) => ({tab: t, index: i}))
        .filter(({tab: candidate, index}) => index !== tabIndex && isInternalTab(candidate))
    : []
  return (
    <aside className={shellClass()}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide">Tab</h3>
      <Field label="Title">
        <TextInput
          value={tab.title}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {title: e.target.value}))}
        />
      </Field>
      <Field label="Slug (folder)" hint="Empty = mounted at root. Renaming triggers .mdx moves.">
        <TextInput
          value={tab.slug}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {slug: e.target.value}))}
        />
      </Field>
      <Field label="Id (internal)">
        <TextInput
          value={tab.id}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {id: e.target.value}))}
        />
      </Field>
      <IconField
        value={tab.icon}
        onChange={icon => onUpdate(updateAt<Tab>(config, path, {icon: icon ?? undefined}))}
      />
      <CheckInput
        label="Expand by default"
        checked={!!tab.defaultOpen}
        onChange={v => onUpdate(updateAt<Tab>(config, path, {defaultOpen: v ? true : undefined}))}
      />
      <Field
        label="Convert to external tab"
        hint="Swap pages for a single outbound URL. The tab keeps its title, icon, and tag."
      >
        <button
          type="button"
          onClick={() => onUpdate(convertTabToExternal(config, tabIndex), [tabIndex])}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-foreground hover:bg-fd-accent"
        >
          Convert to external tab
        </button>
      </Field>
      {canDemote && (
        <Field
          label="Demote into another tab"
          hint="Folds this tab back as a folder-backed section of the chosen tab."
        >
          <div className="flex flex-col gap-1">
            {demoteTargets.map(({tab: target, index}) => (
              <button
                key={target.id}
                type="button"
                onClick={() => {
                  const {config: next, newPath} = demoteTabToGroup(config, tabIndex, index)
                  if (next === config) return
                  onUpdate(next, newPath)
                }}
                className="flex items-center gap-2 rounded border border-fd-border bg-fd-background px-2 py-1.5 text-left text-xs text-fd-foreground hover:bg-fd-accent"
              >
                <FolderInput size={12} className="text-fd-muted-foreground" />
                <span className="truncate">{target.title || target.id}</span>
              </button>
            ))}
          </div>
        </Field>
      )}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground hover:bg-fd-destructive/10 hover:text-fd-destructive"
        >
          Delete tab
        </button>
      </div>
    </aside>
  )
}

function ExternalTabInspector({
  config,
  path,
  tab,
  onUpdate,
  onDelete,
}: {
  config: NavConfig
  path: Path
  tab: ExternalTab
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
}) {
  const tabIndex = path[0]
  return (
    <aside className={shellClass()}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide">External tab</h3>
      <Field label="Title" hint="Label rendered in the header strip and home navbar.">
        <TextInput
          value={tab.title}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {title: e.target.value}))}
        />
      </Field>
      <Field label="URL" hint="Absolute external URL. Opens in a new tab.">
        <TextInput
          value={tab.url}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {url: e.target.value}))}
        />
      </Field>
      <Field label="Id (internal)">
        <TextInput
          value={tab.id}
          onChange={e => onUpdate(updateAt<Tab>(config, path, {id: e.target.value}))}
        />
      </Field>
      <IconField
        value={tab.icon}
        onChange={icon => onUpdate(updateAt<Tab>(config, path, {icon: icon ?? undefined}))}
      />
      <Field label="Tag" hint="Optional badge displayed next to the title (e.g. `new`, `beta`).">
        <TextInput
          value={tab.tag ?? ""}
          onChange={e =>
            onUpdate(updateAt<Tab>(config, path, {tag: e.target.value || undefined}))
          }
        />
      </Field>
      <Field
        label="Convert to internal tab"
        hint="Reset to an empty pages list with a fresh slug. The URL is discarded."
      >
        <button
          type="button"
          onClick={() => onUpdate(convertTabToInternal(config, tabIndex), [tabIndex])}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-foreground hover:bg-fd-accent"
        >
          Convert to internal tab
        </button>
      </Field>
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground hover:bg-fd-destructive/10 hover:text-fd-destructive"
        >
          Delete tab
        </button>
      </div>
    </aside>
  )
}

function GroupInspector({
  config,
  path,
  group,
  onUpdate,
  onDelete,
}: {
  config: NavConfig
  path: Path
  group: GroupRef
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
}) {
  return (
    <aside className={shellClass()}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide">Section</h3>
      <Field label="Title">
        <TextInput
          value={group.group}
          onChange={e => onUpdate(updateAt<GroupRef>(config, path, {group: e.target.value}))}
        />
      </Field>
      <Field
        label="Slug (folder)"
        hint="Empty = sidebar-only group; pages keep their URL. Setting a slug moves contained pages into this folder."
      >
        <TextInput
          value={group.slug ?? ""}
          onChange={e =>
            onUpdate(updateAt<GroupRef>(config, path, {slug: e.target.value || undefined}))
          }
        />
      </Field>
      {group.slug ? (
        <IconField
          value={group.icon}
          onChange={icon => onUpdate(updateAt<GroupRef>(config, path, {icon: icon ?? undefined}))}
        />
      ) : (
        <Field
          label="Icon"
          hint="Icons require a folder-backed section. Add a slug above to enable icons."
        >
          <div className="flex h-7 items-center rounded border border-dashed border-fd-border bg-fd-muted/20 px-2 text-xs text-fd-muted-foreground">
            unavailable for sidebar separators
          </div>
        </Field>
      )}
      <Field label="Tag (badge)">
        <TextInput
          value={group.tag ?? ""}
          onChange={e => onUpdate(updateAt<GroupRef>(config, path, {tag: e.target.value || undefined}))}
        />
      </Field>
      {group.slug && (() => {
        // Top-level = direct child of a tab (path is [tabIdx, groupIdx]).
        // Top-level-in-tab groups expose a binary "render as section heading"
        // toggle (flatten on/off). Sub-groups expose a three-way selector
        // between `section` (separator-styled non-collapsible folder, with the
        // sibling intro page re-parented inside it by `source.ts`) and
        // `folder` (regular collapsible folder); the legacy `flatten` value
        // is still respected when reading but cleared when the user picks
        // an explicit mode to keep the config canonical.
        const isTopLevel = path.length === 2
        const mode = resolveGroupMode(group, {isTopLevelInTab: isTopLevel})
        if (isTopLevel) {
          const flattenEffective = mode === "flatten"
          return (
            <CheckInput
              label="Render as section heading"
              hint={
                group.flatten === undefined && group.mode === undefined
                  ? "Folder stays on disk. Top-level default: on."
                  : "Folder stays on disk; explicit override (clear by re-selecting the default)."
              }
              checked={flattenEffective}
              onChange={v => {
                onUpdate(
                  updateAt<GroupRef>(config, path, {
                    // Top-level default is "flatten"; persist only when the
                    // user diverges from it. Reset both legacy & new fields
                    // together so flipping the toggle never leaves a stale
                    // `mode` lying around.
                    flatten: v ? undefined : false,
                    mode: undefined,
                  }),
                )
              }}
            />
          )
        }
        const hasIntroPage = (group.pages ?? []).some(p => isPage(p) && p.slug === "")
        const subDefault: GroupMode = hasIntroPage ? "section" : "folder"
        const subEffective: GroupMode = mode === "flatten" ? subDefault : mode
        return (
          <Field
            label="Render mode"
            hint={
              group.mode === undefined && group.flatten === undefined
                ? hasIntroPage
                  ? "Default for nested groups with an intro page: section."
                  : "Default for nested groups: folder."
                : "Explicit override (clear by selecting the default)."
            }
          >
            <select
              className="w-full rounded border border-fd-border bg-fd-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40"
              value={subEffective}
              onChange={e => {
                const next = e.target.value as GroupMode
                const wantsDefault = next === subDefault
                onUpdate(
                  updateAt<GroupRef>(config, path, {
                    mode: wantsDefault ? undefined : next,
                    // Clearing the legacy boolean prevents it from out-voting
                    // the new explicit `mode` on the next render.
                    flatten: undefined,
                  }),
                )
              }}
            >
              <option value="section">Section (separator-styled header)</option>
              <option value="folder">Folder (collapsible)</option>
            </select>
          </Field>
        )
      })()}
      <CheckInput
        label="Expand by default"
        checked={!!group.expanded}
        onChange={v => onUpdate(updateAt<GroupRef>(config, path, {expanded: v ? true : undefined}))}
      />
      {group.slug && (
        <Field
          label="Promote to tab"
          hint="Lifts this section to a top-level tab so it appears under the search bar."
        >
          <button
            type="button"
            onClick={() => {
              const {config: next, newPath} = promoteToTab(config, path)
              if (next === config) return
              onUpdate(next, newPath)
            }}
            className="flex items-center gap-2 rounded border border-fd-border bg-fd-background px-2 py-1.5 text-left text-xs text-fd-foreground hover:bg-fd-accent"
          >
            <ArrowUpToLine size={12} className="text-fd-muted-foreground" />
            <span>Make this a tab</span>
          </button>
        </Field>
      )}
      <GroupOpenApi config={config} path={path} group={group} onUpdate={onUpdate} />
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground hover:bg-fd-destructive/10 hover:text-fd-destructive"
        >
          Delete section
        </button>
      </div>
    </aside>
  )
}

function GroupOpenApi({
  config,
  path,
  group,
  onUpdate,
}: {
  config: NavConfig
  path: Path
  group: GroupRef
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
}) {
  const specs = useSpecsList()
  return (
    <OpenApiFields
      value={group.openapi}
      specs={specs}
      onChange={oa => onUpdate(updateAt<GroupRef>(config, path, {openapi: oa}))}
    />
  )
}

function PageInspector({
  config,
  path,
  page,
  onUpdate,
  onDelete,
  titles,
  icons,
}: {
  config: NavConfig
  path: Path
  page: PageRef
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
  titles: Record<string, string>
  icons: Record<string, string>
}) {
  const canonical = pageCanonicalUrl(config, path)
  const specs = useSpecsList()
  const effectiveIcon = resolvePageIcon(page, icons)
  const iconSource: "override" | "frontmatter" | undefined = effectiveIcon
    ? typeof page.icon === "string" && page.icon
      ? "override"
      : "frontmatter"
    : undefined
  return (
    <aside className={shellClass()}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide">Page</h3>
      <Field label="Id (immutable)" hint="The .mdx file's permanent identity. Never edit unless you know what you're doing.">
        <TextInput
          value={page.id}
          onChange={e => onUpdate(updateAt<PageRef>(config, path, {id: e.target.value}))}
        />
      </Field>
      <Field
        label="Slug override"
        hint='Leaf of the URL. Leave blank to default to the last segment of the id. Set "" (with quotes elsewhere) for a folder-index page.'
      >
        <TextInput
          value={page.slug ?? ""}
          onChange={e => onUpdate(updateAt<PageRef>(config, path, {slug: e.target.value || undefined}))}
        />
      </Field>
      <Field label="Current URL">
        <code className="block rounded bg-fd-muted/40 px-2 py-1 text-xs">/{canonical}</code>
      </Field>
      <Field label="Title override" hint={titles[page.id] ? `mdx title: ${titles[page.id]}` : "no mdx title found"}>
        <TextInput
          value={page.title ?? ""}
          onChange={e => onUpdate(updateAt<PageRef>(config, path, {title: e.target.value || undefined}))}
        />
      </Field>
      <IconField
        value={effectiveIcon}
        source={iconSource}
        onChange={icon =>
          onUpdate(updateAt<PageRef>(config, path, pageIconPatch(page, icons, icon)))
        }
      />
      <Field label="Tag (badge)">
        <TextInput
          value={page.tag ?? ""}
          onChange={e => onUpdate(updateAt<PageRef>(config, path, {tag: e.target.value || undefined}))}
        />
      </Field>

      <OpenApiFields
        value={page.openapi}
        specs={specs}
        onChange={oa => onUpdate(updateAt<PageRef>(config, path, {openapi: oa}))}
      />

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground hover:bg-fd-destructive/10 hover:text-fd-destructive"
        >
          Remove from navigation
        </button>
      </div>
    </aside>
  )
}

function OpenApiFields({
  value,
  specs,
  onChange,
}: {
  value: OpenApiRef | undefined
  specs: string[]
  onChange: (next: OpenApiRef | undefined) => void
}) {
  const listId = "nav-editor-spec-list"
  return (
    <>
      <Field
        label="OpenAPI source"
        hint="Bind this entry to an OpenAPI spec file (repo-relative path). Leave blank to skip."
      >
        <input
          list={listId}
          value={value?.source ?? ""}
          placeholder="ecosystem/api/toncenter/v3.yaml"
          onChange={e => {
            const source = e.target.value
            if (!source) {
              onChange(undefined)
              return
            }
            onChange({source, directory: value?.directory})
          }}
          className="w-full rounded border border-fd-border bg-fd-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40"
        />
        <datalist id={listId}>
          {specs.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      {value?.source && (
        <Field
          label="Directory"
          hint="Generated path prefix for per-operation .mdx files. Defaults to the spec's basename."
        >
          <TextInput
            value={value.directory ?? ""}
            onChange={e => onChange({source: value.source, directory: e.target.value || undefined})}
          />
        </Field>
      )}
    </>
  )
}

function LinkInspector({
  config,
  path,
  link,
  onUpdate,
  onDelete,
}: {
  config: NavConfig
  path: Path
  link: LinkRef
  onUpdate: (next: NavConfig, newSelectionPath?: Path | null) => void
  onDelete: () => void
}) {
  return (
    <aside className={shellClass()}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide">External link</h3>
      <Field label="Name">
        <TextInput
          value={link.name}
          onChange={e => onUpdate(updateAt<LinkRef>(config, path, {name: e.target.value}))}
        />
      </Field>
      <Field label="URL">
        <TextInput
          value={link.url}
          onChange={e => onUpdate(updateAt<LinkRef>(config, path, {url: e.target.value}))}
        />
      </Field>
      <IconField
        value={link.icon}
        onChange={icon => onUpdate(updateAt<LinkRef>(config, path, {icon: icon ?? undefined}))}
      />
      <Field label="Tag (badge)">
        <TextInput
          value={link.tag ?? ""}
          onChange={e => onUpdate(updateAt<LinkRef>(config, path, {tag: e.target.value || undefined}))}
        />
      </Field>
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground hover:bg-fd-destructive/10 hover:text-fd-destructive"
        >
          Remove link
        </button>
      </div>
    </aside>
  )
}

// keep this import alive for eslint
void useEffect
