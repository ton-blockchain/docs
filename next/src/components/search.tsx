"use client"
import {useEffect} from "react"
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search"
import {useDocsSearch, type SearchClient} from "fumadocs-core/search/client"
import {createContentHighlighter, type SortedResult} from "fumadocs-core/search"
import {load, type AnyOrama, type RawData} from "@orama/orama"
import {createClientDB, runRankedSearch} from "@/lib/search-core"

/**
 * The exported Orama index is a single static JSON asset. The host serves it
 * gzip-compressed on the wire (`content-encoding: gzip`) and the browser
 * decompresses it transparently, so no client-side decompression is needed.
 */
async function fetchIndexData(): Promise<RawData> {
  const res = await fetch("/api/search")
  if (!res.ok) throw new Error("failed to load search index")
  return res.json() as Promise<RawData>
}

let dbPromise: Promise<AnyOrama> | undefined
function getDB(): Promise<AnyOrama> {
  return (dbPromise ??= fetchIndexData()
    .then(data => {
      const db = createClientDB()
      load(db, data)
      return db
    })
    .catch(err => {
      // A transient fetch failure must not permanently disable search; clear
      // the memo so the next query retries instead of reusing a rejection.
      dbPromise = undefined
      throw err
    }))
}

/**
 * Thin browser wrapper around the shared ranking pipeline in
 * lib/search-core.ts. This file owns only the two browser-specific concerns —
 * fetching/loading the static index and highlighting result snippets — so the
 * relevance logic stays in one place that the offline eval harness scores
 * verbatim. Perf: two Orama passes (~tens of ms each) over a cached index;
 * remark `highlightMarkdown` runs only on the returned rows.
 */
async function runSearch(query: string): Promise<SortedResult[]> {
  const db = await getDB()
  const {term, results} = await runRankedSearch(db, query)
  if (results.length === 0) return []
  const highlighter = createContentHighlighter(term)
  return results.map(r => ({...r, content: highlighter.highlightMarkdown(r.content)}))
}

const searchClient: SearchClient = {search: runSearch, deps: []}

export default function DefaultSearchDialog(props: SharedProps) {
  const {search: searchValue, setSearch, query} = useDocsSearch({client: searchClient})

  // Pre-warm the static index on dialog mount, BEFORE the user types
  // their first character. The 46MB gzipped index takes ~200–500ms over
  // the wire + ~100ms to `load()` into Orama on cold-start; deferring it
  // to the first keystroke means the first query feels laggy. Mounting
  // the dialog is already the user's "I want to search" signal, so
  // kicking off the fetch here is correctly scoped (no idle bandwidth
  // burn on users who never search). Catch is silent — `getDB`'s own
  // memo handler resets `dbPromise` on transient fetch failure so the
  // first real query will retry.
  useEffect(() => {
    getDB().catch(() => {})
  }, [])

  return (
    <SearchDialog
      search={searchValue}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose className="max-md:hidden" />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  )
}
