import {visibleSource} from "@/lib/source"
import {createFromSource} from "fumadocs-core/search/server"

export const revalidate = false

/**
 * Long prose sections (TON whitepapers, TVM spec, …) emit multi-KB index
 * blocks whose tail almost never decides a match. Capping block length keeps
 * the client-side Orama index small (faster parse + query) without dropping
 * whole sections from search. ~2000 chars ≈ a long paragraph group.
 */
const MAX_BLOCK_CHARS = 2000

/**
 * Per-page cap for the synthetic "code symbols" block. Fumadocs' structured
 * data extraction skips fenced/inline code, so identifiers that appear ONLY
 * in code (`OP_SENDMSG`, `loadUint`, `op::transfer`, get-method names) were
 * unsearchable — the single biggest measured gap on developer queries. We
 * mine just the symbol-like tokens (not whole listings) so the index gains
 * findability without the BM25 dilution / size blow-up of indexing all code.
 */
const MAX_CODE_CHARS = 2500

type StructuredData = {
  headings: {id: string; content: string}[]
  contents: {heading: string | undefined; content: string}[]
}

async function resolveStructuredData(data: unknown): Promise<StructuredData> {
  const d = data as {
    structuredData?: StructuredData | (() => Promise<StructuredData>)
    load?: () => Promise<{structuredData: StructuredData}>
  }
  if (d.structuredData)
    return typeof d.structuredData === "function" ? d.structuredData() : d.structuredData
  if (typeof d.load === "function") return (await d.load()).structuredData
  throw new Error("Cannot find structured data from page for search index")
}

const FENCED_CODE = /```[^\n]*\n([\s\S]*?)```/g
const INLINE_CODE = /`([^`\n]+)`/g

/** Keep a token only if it *looks* like a code symbol, not prose/keywords. */
function isSymbolLike(t: string): boolean {
  if (t.length < 2 || t.length > 40) return false
  if (/^\d+$/.test(t)) return false
  return (
    t.includes("_") || // snake_case, OP_SENDMSG
    t.includes("::") || // FunC/C++ scope, op::transfer
    /[a-z][A-Z]/.test(t) || // camelCase, loadUint
    /^[A-Z][A-Z0-9]{1,}$/.test(t) || // ALLCAPS opcode, SENDRAWMSG
    /[a-zA-Z]\d|\d[a-zA-Z]/.test(t) // alnum mix, int257 / wallet v3
  )
}

/**
 * Mine distinct code-symbol tokens from a page's raw MDX. Order-preserving,
 * de-duplicated, length-capped — a compact "symbol bag" per page rather than
 * verbatim code.
 */
function extractCodeSymbols(raw: string): string {
  let code = ""
  for (const m of raw.matchAll(FENCED_CODE)) code += m[1] + "\n"
  for (const m of raw.matchAll(INLINE_CODE)) code += m[1] + "\n"
  if (code.length === 0) return ""
  const seen = new Set<string>()
  let out = ""
  for (const tok of code.split(/[^A-Za-z0-9_:]+/)) {
    const t = tok.replace(/^:+|:+$/g, "")
    if (!t || seen.has(t) || !isSymbolLike(t)) continue
    seen.add(t)
    out += (out ? " " : "") + t
    if (out.length >= MAX_CODE_CHARS) break
  }
  return out
}

export const {staticGET: GET} = createFromSource(visibleSource, {
  // Orama's sorter store is only consumed by `sortBy` queries. Fumadocs search
  // never sorts (it groups by page and ranks by relevance), so disabling the
  // sorter removes the single largest dead-weight branch of the exported index.
  sort: {enabled: false},
  // Index-time English stemming. `language` MUST live inside the tokenizer
  // config (not top-level) — Orama rejects a top-level `language` alongside a
  // custom tokenizer (NO_LANGUAGE_WITH_CUSTOM_TOKENIZER). This MUST stay in
  // sync with the query-time tokenizer in lib/search-core.ts, or stemmed
  // query terms miss the index and recall silently collapses.
  //
  // allowDuplicates:true restores real BM25 term-frequency (Orama's tokenizer
  // dedupes per field by default → tf capped at 1, flattening tf·idf to just
  // idf). Now that the BM25 blend is active (`bm25Weight=2.5` in
  // DEFAULT_TUNING), true tf is what `bm25/maxBm25` is supposed to be
  // ranging over. Must match the query-time tokenizer config in
  // lib/search-core.ts.
  components: {tokenizer: {language: "english", stemming: true, allowDuplicates: true}},
  async buildIndex(page) {
    const sd = await resolveStructuredData(page.data)
    const contents = sd.contents.map(c =>
      c.content.length > MAX_BLOCK_CHARS
        ? {heading: c.heading, content: c.content.slice(0, MAX_BLOCK_CHARS)}
        : c,
    )

    // Curated synonyms: the `keywords` frontmatter (terms a reader would type
    // that don't appear verbatim on the page — "fungible token", "seed
    // phrase", …). Indexed as a content block so the page becomes a candidate
    // for those queries. This is the safe synonym mechanism — per-page and
    // editor-controlled — unlike query-time expansion, which regressed.
    const keywords = page.data as {keywords?: unknown}
    if (Array.isArray(keywords.keywords) && keywords.keywords.length > 0) {
      contents.push({
        heading: "Keywords",
        content: keywords.keywords.filter(k => typeof k === "string").join(" "),
      })
    }

    // Frontmatter `description` — the short editor-curated summary that
    // appears in nav cards and as the canonical SEO blurb. Promotes the
    // page as a candidate for queries that paraphrase the description's
    // verbs/nouns even when the body text uses different phrasing
    // ("Run a validator node…" → matches query "running validator"). Stored
    // as a separate content block (not merged into body) so its presence
    // can be diagnosed via the same `#Description` URL-fragment trick used
    // for `#Keywords`. Empty/missing → skipped (most pages have non-empty
    // descriptions; the few empty ones just don't contribute this signal).
    const desc = (page.data as {description?: unknown}).description
    if (typeof desc === "string" && desc.trim().length > 0) {
      contents.push({heading: "Description", content: desc.trim()})
    }

    // Code symbols mined from raw MDX (see extractCodeSymbols). `getText` is
    // the fumadocs-mdx accessor; guard it so a page type without it degrades
    // gracefully to no code block rather than failing the whole index build.
    const getText = (page.data as {getText?: (t: "raw" | "processed") => Promise<string>}).getText
    if (typeof getText === "function") {
      const symbols = extractCodeSymbols(await getText.call(page.data, "raw"))
      if (symbols.length > 0) contents.push({heading: "Code symbols", content: symbols})
    }

    return {
      title: page.data.title ?? "",
      description: page.data.description,
      url: page.url,
      // fumadocs' buildDocuments emits sub-docs as `${id}-${N}`. Using the
      // raw URL collides when two pages exist as `foo` and `foo-1` (OpenAPI
      // generator sometimes emits both): the first page's 2nd sub-doc id
      // (`foo-1`) clashes with the second page's primary id. Appending `#`
      // — which cannot appear in a fumadocs path URL — keeps page ids and
      // sub-doc ids in disjoint key spaces.
      id: `${page.url}#`,
      structuredData: {headings: sd.headings, contents},
    }
  },
})
