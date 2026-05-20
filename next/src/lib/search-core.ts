import {create, getByID, search, type AnyOrama} from "@orama/orama"
import {tokenizer as oramaTokenizer} from "@orama/orama/components"
import type {SortedResult} from "fumadocs-core/search"

/**
 * Shared Orama English tokenizer used to *stem* re-rank inputs so the score
 * function compares query/title in the same stem space the index uses (e.g.
 * "validating" → "valid", "wallets" → "wallet"). Without this, a query like
 * "validating" misses a title "Validation" on the substring `includes` check
 * even though the Orama pass hits it via the stemmed inverted index. Lazy
 * + memoized so the cost is paid once per process (browser or Node harness),
 * not per query. Awaited once at the top of `runRankedSearch`.
 */
type StemTokenizer = {tokenize: (s: string) => Promise<string[]> | string[]}
let stemTokenizerPromise: Promise<StemTokenizer> | undefined
function getStemTokenizer(): Promise<StemTokenizer> {
  return (stemTokenizerPromise ??= Promise.resolve(
    oramaTokenizer.createTokenizer({language: "english", stemming: true}),
  ) as Promise<StemTokenizer>)
}

async function stemString(s: string): Promise<string[]> {
  const tk = await getStemTokenizer()
  const out = await tk.tokenize(s)
  return Array.isArray(out) ? out : [String(out)]
}

/**
 * Empty Orama instance with the query-time tokenizer. `load()` overwrites
 * schema/index/docs, so the `{_: }` schema is just a placeholder (the pattern
 * Fumadocs uses internally). The tokenizer here MUST mirror the index-time
 * config in app/api/search/route.ts — `language` lives *inside* the tokenizer
 * (Orama forbids a top-level `language` with a custom tokenizer:
 * NO_LANGUAGE_WITH_CUSTOM_TOKENIZER). If the two drift, stemmed query terms
 * stop lining up with the stored stems and recall silently collapses. Both
 * the browser dialog and the offline harness build their DB here so the
 * guarantee is enforced in one place.
 */
export function createClientDB(): AnyOrama {
  return create({
    schema: {_: "string"},
    sort: {enabled: false},
    components: {tokenizer: {language: "english", stemming: true, allowDuplicates: true}},
  })
}

/**
 * Pure, environment-agnostic search ranking pipeline shared by the browser
 * search dialog (components/search.tsx) and the offline relevance harness
 * (scripts/search-eval). Keeping a single implementation here is what makes
 * the eval numbers trustworthy: the harness scores the *exact* code that
 * ships, not a hand-kept reproduction that silently drifts.
 *
 * Nothing in this module touches React, the network, or the filesystem. The
 * caller is responsible for obtaining a loaded Orama instance (browser:
 * fetch + load; harness: fs + load) and for any presentation concern such as
 * snippet highlighting.
 */

export type IndexedDoc = {
  id: string | number
  // Fumadocs `createFromSource` emits one "page" row (content = title) plus
  // "heading"/"text" rows (content = heading / paragraph) sharing a
  // `page_id`. Earlier fumadocs versions used "head" instead of "heading"
  // — the runtime check below tolerates either to avoid an invisible recall
  // drop on a downgrade.
  type: "page" | "heading" | "head" | "text"
  content: string
  url: string
  breadcrumbs?: string[]
}

// Emit far more distinct pages than the stock 60 flattened rows. On a 48k-doc
// index a broad query yields hundreds of groups; with the stock 60-cap +
// 8-hits/page the right page is often unreachable past rank ~10. Fewer hits
// per page + a larger cap surfaces many more distinct pages ("breadth").
export const MAX_RESULTS = 120
export const HITS_PER_PAGE = 3

// English stopwords. Stripping them from the query (not the index) removes the
// noise that made e.g. "how to deploy a contract" match "a"-heavy opcode
// pages. NOTE: deliberately omits get/set/use/call/send/run — those are
// load-bearing TON developer terms ("get method", "send message"), and
// dropping them silently tanked recall on the most common dev queries.
export const DEFAULT_STOPWORDS = new Set(
  (
    "a an and are as at be but by for from has have how i in into is it its my no not of on or " +
    "that the their then there these this to was what when where which who why with you your " +
    "does could should would about over via using"
  ).split(" "),
)

/**
 * High-traffic navigational ("best bet") queries. When the normalized query
 * matches a key exactly, the mapped page is force-promoted to rank #1. This
 * is bounded and deterministic: it only fires on these exact strings, so it
 * cannot regress the long tail. Targets the queries where users expect the
 * canonical landing page, not the most term-dense page.
 */
export const DEFAULT_PINS: Record<string, string> = {
  "ton connect": "/applications/ton-connect/overview",
  tonconnect: "/applications/ton-connect/overview",
  jetton: "/blockchain-basics/standard/tokens/jettons/overview",
  jettons: "/blockchain-basics/standard/tokens/jettons/overview",
  nft: "/blockchain-basics/standard/tokens/nft/overview",
  nfts: "/blockchain-basics/standard/tokens/nft/overview",
  tvm: "/blockchain-basics/tvm/overview",
  tolk: "/blockchain-basics/tolk/overview",
  func: "/blockchain-basics/languages/func/overview",
  fift: "/blockchain-basics/languages/fift/overview",
  "tl-b": "/blockchain-basics/languages/tl-b/overview",
  tlb: "/blockchain-basics/languages/tl-b/overview",
  wallet: "/blockchain-basics/standard/wallets/how-it-works",
  wallets: "/blockchain-basics/standard/wallets/how-it-works",
  "smart contract": "/blockchain-basics/contract-dev/introduction",
  "smart contracts": "/blockchain-basics/contract-dev/introduction",
  blueprint: "/blockchain-basics/contract-dev/blueprint/overview",
  "get method": "/blockchain-basics/tvm/get-method",
  "get methods": "/blockchain-basics/tvm/get-method",
  toncenter: "/applications/api/toncenter/introduction",
  api: "/applications/api/toncenter/introduction",
  toolset: "/overview/toolset",
  "start here": "/overview/start-here",
  glossary: "/foundations/glossary",
}

/**
 * Curated misspelling -> correction map for terms whose edit distance to the
 * canonical TON term exceeds Orama's fuzzy tolerance ceiling (2), e.g.
 * "jeton" -> "jetton", "transcation" -> "transaction". Purely orthographic
 * and tiny, which is why it can be applied unconditionally (see
 * runRankedSearch) without the noise that sank *semantic* query expansion.
 */
export const DEFAULT_SPELL: Record<string, string> = {
  jeton: "jetton",
  jetons: "jettons",
  transcation: "transaction",
  trasaction: "transaction",
  contrat: "contract",
  contarct: "contract",
  walet: "wallet",
  wallett: "wallet",
  blockchian: "blockchain",
  blokchain: "blockchain",
  smrt: "smart",
  validater: "validator",
  transfor: "transfer",
  tonceter: "toncenter",
  toncentre: "toncenter",
  blueprnt: "blueprint",
  blueprit: "blueprint",
  // hard-cases.json typo_beyond_2: edit distance > 1 typos Orama's
  // tolerance:1 second pass can't reach. All three appear in real user
  // failure traces; corrections are unambiguous.
  valdiator: "validator",
  valdator: "validator",
  dictinary: "dictionary",
  dictionry: "dictionary",
  concensus: "consensus",
  consensous: "consensus",
}

export interface Tuning {
  stopwords: Set<string>
  /** Exact normalized-query -> canonical URL. Empty disables pinning. */
  pins: Record<string, string>
  /**
   * Per-token misspelling -> correction. When any query token matches, a
   * second Orama pass on the corrected query is unioned in and the corrected
   * tokens join the re-rank set. NOT recall-gated: the gate (fire only when
   * few groups found) never tripped — fuzzy search almost always returns
   * *something*, so hard typos fail on ranking, not recall. The noise risk of
   * an always-on corrected pass is bounded because the map is tiny and purely
   * orthographic (unlike semantic synonym expansion, which regressed).
   */
  spell: Record<string, string>
  /**
   * Per-token bonus when the term appears in a page's *curated* index rows —
   * the synthetic "Keywords" / "Code symbols" blocks (identified by the
   * `#Keywords` / `#Code symbols` URL fragment). High precision because those
   * surfaces are editor-/symbol-curated, not arbitrary prose, so this does
   * NOT have the canonical-page-demotion problem that sank generic proximity.
   * 0 disables.
   */
  structHitWeight: number
  /** Bonus when all query tokens occur in a page's matched text. 0 disables. */
  allTermsWeight: number
  /** Bonus when query tokens occur adjacently in matched text. 0 disables. */
  proximityWeight: number
  /** Re-rank weights for term presence in title / breadcrumbs+url / url. */
  titleWeight: number
  haystackWeight: number
  urlWeight: number
  /**
   * Weight on Orama's own BM25 relevance, folded into the re-rank as
   * `bm25Weight * (groupBM25 / maxGroupBM25)` (∈[0,1] after min-max over the
   * candidate set). The shipped pipeline historically DISCARDED BM25 entirely
   * (groups were ordered only by a coarse integer lexical heuristic with
   * Orama insertion order as the sole tiebreaker), so near-tied canonical
   * pages were separated by crawl order, not relevance. Raw BM25 alone
   * regresses (it floats long term-dense reference pages over short canonical
   * ones — measured), which is exactly why this is a *calibrated blend* on
   * top of the lexical heuristic, not a replacement. >0 also promotes BM25
   * from "unused" to the primary tiebreaker. 0 = exact legacy behavior.
   */
  bm25Weight: number
  /**
   * Optional BM25 parameters threaded into every Orama pass. `b` is the
   * document-length penalty (default 0.75); the corpus mixes short canonical
   * pages with multi-KB reference/whitepaper pages, so this is the principled
   * knob for the long-page-floats problem. undefined = Orama defaults
   * (k=1.2, b=0.75, d=0.5) = exact legacy behavior.
   */
  relevance?: {k?: number; b?: number; d?: number}
  /**
   * Bonus when the page title (normalized) exactly equals the meaningful
   * query, or (titlePrefixWeight) when the title starts with it. Substring
   * `includes` weighting can't tell "Wallet" from "How wallets work" for the
   * query "wallet"; this restores the exact/prefix preference users expect
   * for navigational/exact intents. 0 disables.
   */
  exactTitleWeight: number
  titlePrefixWeight: number
  /**
   * Use stemmed tokens against stemmed title/haystack/url when computing
   * title/haystack/url presence bonuses and the exact-title preference.
   * The index is built with English stemming, but the re-rank historically
   * did a raw `title.includes(t)` on unstemmed query tokens, so a query for
   * "validating" missed a title "Validation" on the substring check even
   * though the Orama pass surfaced the page via the stemmed inverted index
   * (the substring fails because the stems aren't substrings of one another).
   * Stemming both sides lets the re-rank reward the same morphological
   * matches Orama already counted. true = stem-aware; false = legacy.
   */
  stemReRank: boolean
  /**
   * Bonus when an indexed heading (a `type:"heading"` row from
   * `structuredData.headings`) contains the full normalized query, OR the
   * per-token bonus when a heading contains an individual query token.
   * Pages where the query matches a section heading are stronger candidates
   * than pages where the same terms only appear in body paragraphs. 0
   * disables. Phrase-match earns this weight × tokens.length so multi-word
   * heading hits weigh comparably to per-token heading hits.
   */
  headingMatchWeight: number
  /**
   * Weight on Orama's BM25 over a *title-only* second pass (`where:
   * {type:"page"}`). The page rows have content equal to the title, so a
   * second exact-tolerance Orama pass restricted to them returns the
   * per-page BM25 of the title surface alone — high IDF for rare title
   * tokens, document length is the title length (very short). Min-max
   * normalized over the candidate set before being added (`w * tb /
   * maxTb`) so the contribution is bounded and corpus-portable, matching
   * the bm25Weight blend pattern. 0 disables.
   */
  titleBM25Weight: number
  /**
   * When true, each per-token title/haystack/url presence bonus is
   * multiplied by `log(maxDf / df_t)` clamped to [0.5, 2.5], where df_t
   * is the row-level document frequency of the token in the corpus.
   * Rationale: a query "how to deploy a contract" → kept tokens
   * `[deploy, contract]`. Without IDF weighting, both earn `titleWeight=2`
   * per surface; a title hit on "contract" (very common across pages)
   * counts as much as a title hit on "deploy" (much rarer), which floods
   * concept queries with title-noise. The BM25 blend captures IDF *for
   * the whole page*, not per-token-per-surface; this lever extends the
   * IDF signal into the lexical heuristic where it's actually most
   * useful (titles + URLs). false = legacy flat-weight per token.
   */
  idfWeightTokens: boolean
  /**
   * Per-token bonus when the term appears in a page's auto-mined `#Code
   * symbols` row AND the query itself contains a code-identifier-shaped
   * token (camelCase ≥ 8 chars, snake_case, ALLCAPS opcode, alnum mix,
   * ::-scoped, dotted method). Unconditional code-symbol re-rank wrecked
   * concept intent (measured), but conditioning on token shape limits the
   * bonus to queries that actually mean a code symbol — the regressing
   * prose queries can't activate it. 0 disables.
   */
  codeSymbolWeight: number
}

/**
 * Production tuning. The harness clones this and flips one field at a time to
 * ablate each lever in isolation. Defaults reflect what the 100+ query eval
 * set validated as a net improvement; see scripts/search-eval/README.
 */
export const DEFAULT_TUNING: Tuning = {
  stopwords: DEFAULT_STOPWORDS,
  pins: DEFAULT_PINS,
  spell: DEFAULT_SPELL,
  structHitWeight: 2,
  // Proximity/all-terms bonuses measured net-negative on hit@1 and MRR (they
  // float long reference pages over canonical short pages), so disabled. The
  // code path stays for the harness to re-ablate if the corpus changes.
  allTermsWeight: 0,
  proximityWeight: 0,
  titleWeight: 2,
  haystackWeight: 1,
  urlWeight: 1,
  // Validated on a 1375-query auto-mined, index-grounded HELD-OUT set the
  // tuning never saw (scripts/search-eval/{mine-evalset,report,confirm}.ts).
  // bm25=2.5 + exactTitle=3 is the Pareto knee: mined-test MRR +0.0168,
  // Hit@1 +0.0183, nDCG@10 +0.0150 (all paired-permutation p≤0.0004) with
  // ZERO curated regression (curated metrics byte-identical). bm25=3 buys
  // ~14% more held-out gain but regresses 2 curated queries — rejected, the
  // hand-verified curated set is the higher-confidence signal. `relevance`
  // (BM25 k/b/d) left at Orama defaults: every off-default value measured
  // net-negative on held-out, both directions (the harness's recurring
  // "intuition is wrong on this corpus" result). titlePrefix: not
  // significant on held-out — left off for parsimony.
  bm25Weight: 2.5,
  relevance: undefined,
  exactTitleWeight: 3,
  titlePrefixWeight: 0,
  // stemReRank: small Hit@1 lift on the graded gold slice but a held-out
  // mined-test MRR regression of ~0.009 (p≈0.05) driven by precision loss on
  // synonym/typo intents — the corpus has many morphology-collision pages
  // (test/tests/testing/tester all stem to "test") that the stricter
  // word-equality match cannot disambiguate. Lever stays in the harness for
  // future re-evaluation (esp. on a graded slice ≥ 300) but ships off.
  stemReRank: false,
  // headingMatchWeight: matched ablations swept 0.1 / 0.2 / 0.25 / 0.3 /
  // 0.35 / 0.5 — 0.2 is the Pareto knee. Mined-test all three metrics
  // improve significantly (Hit@1 +0.020 p=0.014, MRR +0.017 p=0.003,
  // nDCG@10 +0.018 p=0.0004) and curated improves with ZERO regressions
  // (curated Hit@1 +0.016, MRR +0.011). Higher weights buy more held-out
  // gain at the cost of curated regressions (0.25 → 1, 0.3+ → 2). Per the
  // harness discipline: no curated regression > marginal held-out delta.
  // On the gold slice this also lifts troubleshooting from 0.497 to 0.527
  // (one of the four worst-performing intents per FUTURE-WORK §2).
  headingMatchWeight: 0.2,
  // titleBM25Weight: measured negative at every weight (0.5/1/2). The
  // shipped bm25Weight already captures title signal because the page
  // row's content IS the title, so a separate title-only Orama pass
  // contributes mostly noise. Curated -1pp Hit@1, mined-test -0.6pp
  // MRR at w=0.5. Kept as a lever for re-ablation if the corpus
  // changes (e.g. very long titles become common), but ships off.
  titleBM25Weight: 0,
  // idfWeightTokens: measured strongly negative across all 3 binary
  // slices (curated Hit@1 -3.2pp, mined-test Hit@1 -1.8pp, MRR -1.2pp).
  // The intuition was that "deploy" (rare) should outweigh "contract"
  // (common) in per-token title bonuses; in practice the BM25 blend
  // already captures the IDF signal at the page level, and adding IDF
  // multipliers to the lexical heuristic creates an opposing signal that
  // demotes canonical landing pages whose titles happen to use common
  // domain words. The harness's recurring "intuition is wrong on this
  // corpus" pattern. Lever stays for re-ablation only if BM25 blending
  // is later replaced; ships off.
  idfWeightTokens: false,
  // codeSymbolWeight: conditional code-symbol bonus, fires only when the
  // query contains a shape-real code identifier (underscore, ::-scope,
  // dotted method, or camelCase ≥ 8 chars). On gold (n=349) this adds
  // +0.0057 hit@1, +0.019 nDCG_g on identifier intent, with byte-identical
  // curated / mined-train / mined-test (the shape gate filters all
  // binary-slice queries out, so the lever can only help the new
  // signal-rich gold queries). Token-shape strictness avoids the previously
  // measured regression of unconditional code-symbol re-ranking.
  codeSymbolWeight: 1,
}

/**
 * Baseline tuning == the previously shipped behavior, used by the harness to
 * reproduce the pre-tuning baseline exactly (no pins, no spell, no proximity,
 * old stopword list semantics aside). Levers are added back one by one.
 */
export const BASELINE_TUNING: Tuning = {
  stopwords: new Set(
    (
      "a an and are as at be but by for from has have how i in into is it its my no not of on or " +
      "that the their then there these this to was what when where which who why with you your do " +
      "does can could should would about over via using use get set make"
    ).split(" "),
  ),
  pins: {},
  spell: {},
  structHitWeight: 0,
  allTermsWeight: 0,
  proximityWeight: 0,
  titleWeight: 2,
  haystackWeight: 1,
  urlWeight: 1,
  bm25Weight: 0,
  relevance: undefined,
  exactTitleWeight: 0,
  titlePrefixWeight: 0,
  stemReRank: false,
  headingMatchWeight: 0,
  titleBM25Weight: 0,
  idfWeightTokens: false,
  codeSymbolWeight: 0,
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ")
}

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

export function meaningfulTokens(query: string, stopwords: Set<string>): string[] {
  const toks = tokenize(query)
  const kept = toks.filter(t => t.length > 1 && !stopwords.has(t))
  return kept.length > 0 ? kept : toks
}

/**
 * Token-shape heuristic for "this query token names a code identifier."
 * Stricter than the index-time `isSymbolLike` mirror would be — we must
 * exclude common TON-domain acronyms (TON, NFT, TVM, TEP, BFT, DAG, SBT)
 * and short camelCase brand names (iOS, FunC, dTON) that trigger false
 * positives on prose queries. Real code identifiers are:
 *   - snake_case / SCREAMING_SNAKE (must contain `_`),
 *   - `::`-scoped (FunC `op::transfer`, Tolk `cell::empty`),
 *   - longer camelCase (≥ 8 chars, e.g. `getAddressState`, `sendBatch`),
 *   - dotted method access (`SendMode.PAY_GAS_SEPARATELY`).
 * Runs on the ORIGINAL token (before lowercasing).
 */
export function looksLikeCodeSymbol(t: string): boolean {
  if (t.length < 2 || t.length > 40) return false
  if (/^\d+$/.test(t)) return false
  if (t.includes("_")) return true
  if (t.includes("::")) return true
  if (t.includes(".") && /[a-zA-Z]/.test(t)) return true
  if (/[a-z][A-Z]/.test(t) && t.length >= 8) return true
  return false
}

// `bm25` is the max per-hit Orama relevance in the group, captured from the
// pass that first contributed the page (first-seen wins, mirroring `hits`).
// Grouped Orama results DO expose a numeric per-hit `score` (verified against
// the real fumadocs static index: each `group.result[]` element is
// `{id, score, document}`); the legacy pipeline simply never read it.
//
// First-seen, not max-across-passes: the "merge max" alternative is
// theoretically cleaner (the min-max normalization downstream would compare
// scores from comparable passes), but measured ΔMRR ≈ -0.005 on mined-test
// because the tolerance-1 fuzzy pass occasionally gives an irrelevant
// near-miss page a higher BM25 than its exact-match neighbors and that
// score then outranks the true target. The first-seen tie-break is
// effectively a "trust the exact pass over fuzzy" rule, which the corpus
// rewards. Keep this comment in sync with the FUTURE-WORK §9 "not worth"
// list if the alternative is re-considered.
type Grouped = {page: IndexedDoc; hits: IndexedDoc[]; bm25: number}

function collectGroups(
  db: AnyOrama,
  results: {groups?: {values: unknown[]; result: {score?: number; document: unknown}[]}[]},
  into: Map<string, Grouped>,
): void {
  for (const group of results.groups ?? []) {
    const pageId = String(group.values[0])
    if (into.has(pageId)) continue
    const page = getByID(db, pageId) as IndexedDoc | undefined
    if (!page) continue
    const hits: IndexedDoc[] = []
    let bm25 = 0
    for (const hit of group.result) {
      if (typeof hit.score === "number" && hit.score > bm25) bm25 = hit.score
      const doc = hit.document as IndexedDoc
      if (doc.type !== "page") hits.push(doc)
    }
    into.set(pageId, {page, hits, bm25})
  }
}

async function twoPassGroups(
  db: AnyOrama,
  term: string,
  relevance?: {k?: number; b?: number; d?: number},
): Promise<Map<string, Grouped>> {
  const groups = new Map<string, Grouped>()
  for (const tolerance of [0, 1]) {
    const res = (await search(db, {
      term,
      tolerance,
      limit: MAX_RESULTS,
      properties: ["content"],
      groupBy: {properties: ["page_id"], maxResult: HITS_PER_PAGE},
      ...(relevance ? {relevance} : {}),
    })) as unknown as {
      groups?: {values: unknown[]; result: {score?: number; document: unknown}[]}[]
    }
    collectGroups(db, res, groups)
  }
  return groups
}

/** True if every token appears (substring) in `text`. */
function containsAllTokens(text: string, tokens: string[]): boolean {
  for (const t of tokens) if (!text.includes(t)) return false
  return true
}

/**
 * Heuristic for "looks like a code symbol, not prose/keyword" — query side.
 * The index-side counterpart in app/api/search/route.ts is the case-sensitive
 * predicate that decided which raw code tokens to keep in the synthetic
 * `#Code symbols` block; this one decides at query time whether the user
 * typed something that *resembles* one of those tokens, so the structHit
 * bonus can fire on the right rows without firing on natural-language
 * queries. Tokens here are pre-lowercased (see `tokenize` above), so the
 * camelCase / ALLCAPS branches that the index-side predicate uses cannot
 * fire — relying instead on `_`, `::`, and the alnum-mix branch, which all
 * survive lowercasing. Drop in here if you ever change the indexer's
 * predicate; the two should agree on the "is this a code token?" question.
 */
function querySymbolLike(t: string): boolean {
  if (t.length < 2 || t.length > 40) return false
  if (/^\d+$/.test(t)) return false
  return (
    t.includes("_") || // snake_case, op_sendmsg (lowercased)
    t.includes("::") || // FunC/C++ scope, op::transfer
    /[a-z]\d|\d[a-z]/.test(t) // alnum mix, int257 / v3 / wallet5
  )
}

/**
 * Crude proximity: the smallest window (in characters) spanning a first
 * occurrence of every token. Returns Infinity if any token is missing. Lower
 * is tighter. Used only to award a bounded bonus to pages where the query
 * terms actually appear close together (e.g. an exact phrase) rather than
 * scattered across a long reference page.
 */
function proximitySpan(text: string, tokens: string[]): number {
  if (tokens.length < 2) return Infinity
  let lo = Infinity
  let hi = -Infinity
  for (const t of tokens) {
    const i = text.indexOf(t)
    if (i < 0) return Infinity
    lo = Math.min(lo, i)
    hi = Math.max(hi, i + t.length)
  }
  return hi - lo
}

export type RawResult = Omit<SortedResult, "content"> & {content: string}

/**
 * Run the full relevance pipeline against a loaded Orama index and return
 * ranked, de-duplicated rows ready for presentation (no highlighting applied).
 *
 * Levers (all query-side unless noted), each independently ablatable via
 * `tuning`:
 *  1. stopword-stripped query (domain-aware list);
 *  2. optional exact-query pin -> force canonical page to #1;
 *  3. two Orama passes — exact (tolerance 0) then fuzzy (tolerance 1) —
 *     unioned by page, so typos keep recall without losing precision;
 *  4. low-recall spelling-correction fallback (gated, never unconditional);
 *  5. breadth: small per-page hit cap + large total cap so the re-rank can
 *     reach pages buried past rank ~10;
 *  6. re-rank distinct pages by query-term presence in title / breadcrumbs /
 *     URL, plus optional all-terms and proximity bonuses computed over the
 *     page's matched snippets — floats canonical pages above long,
 *     term-spammy reference pages.
 */
export async function runRankedSearch(
  db: AnyOrama,
  query: string,
  tuning: Tuning = DEFAULT_TUNING,
): Promise<{term: string; results: RawResult[]}> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return {term: "", results: []}

  const normalized = normalizeQuery(trimmed)
  let tokens = meaningfulTokens(trimmed, tuning.stopwords)
  // Mirror `meaningfulTokens` over the un-lowercased query so each token's
  // original casing is available for code-symbol shape detection (which is
  // case-sensitive — camelCase, ALLCAPS, snake_case all matter).
  const stopL = new Set([...tuning.stopwords].map(w => w.toLowerCase()))
  const rawSplit = trimmed.split(/\s+/).filter(Boolean)
  const rawKept = rawSplit.filter(t => t.length > 1 && !stopL.has(t.toLowerCase()))
  const originalTokens = rawKept.length > 0 ? rawKept : rawSplit
  const hasCodeShapedToken = originalTokens.some(looksLikeCodeSymbol)
  const term = tokens.join(" ")

  const groups = await twoPassGroups(db, term, tuning.relevance)

  // Spelling correction: if any token has a curated correction, union a second
  // pass on the corrected query and let the corrected tokens participate in
  // re-ranking. Additive only — never drops the original matches.
  if (Object.keys(tuning.spell).length > 0) {
    const corrected = tokens.map(t => tuning.spell[t] ?? t)
    if (corrected.some((t, i) => t !== tokens[i])) {
      const extra = await twoPassGroups(db, corrected.join(" "), tuning.relevance)
      for (const [k, v] of extra) if (!groups.has(k)) groups.set(k, v)
      tokens = Array.from(new Set([...tokens, ...corrected]))
    }
  }

  // Min-max BM25 normalization over the candidate set so the relevance term
  // is scale-free and the tuning weight is corpus-portable. Computed once
  // (not per-group) — `score()` reads `maxBm25` from this closure.
  let maxBm25 = 0
  for (const g of groups.values()) if (g.bm25 > maxBm25) maxBm25 = g.bm25
  // `queryNorm` is the user's meaningful query as TYPED — NOT the
  // post-spell-correction expansion. Used downstream for exact-title and
  // heading-phrase comparisons. The earlier code defined this as
  // `tokens.join(" ")` AFTER the spell-correction expansion, which broke
  // exact-title matching on misspelled queries (the comparison became
  // e.g. `"jetton" === "jeton jetton"` → never fires). `correctedQueryNorm`
  // is the spell-corrected variant for the same comparisons — so a page
  // titled "Jetton" matches a user's "jeton" via the corrected form.
  const queryNorm = term
  const correctedQueryNorm =
    Object.keys(tuning.spell).length > 0
      ? term
          .split(" ")
          .map(w => tuning.spell[w] ?? w)
          .join(" ")
      : term

  // Title-only BM25: optional second Orama pass restricted to `type:"page"`
  // rows (content = title). Returns per-page Orama relevance of the title
  // surface alone, which gives high IDF + small document length to rare
  // title tokens. Min-max normalized into [0, titleBM25Weight] so the
  // contribution is bounded the same way bm25Weight is.
  const titleBM25: Map<string, number> = new Map()
  let maxTitleBM25 = 0
  if (tuning.titleBM25Weight > 0) {
    const tRes = (await search(db, {
      term,
      tolerance: 0,
      properties: ["content"],
      where: {type: "page"},
      limit: MAX_RESULTS,
      ...(tuning.relevance ? {relevance: tuning.relevance} : {}),
    })) as unknown as {hits?: {score?: number; document: unknown}[]}
    for (const hit of tRes.hits ?? []) {
      const doc = hit.document as IndexedDoc
      if (typeof hit.score === "number") {
        const prev = titleBM25.get(doc.url) ?? 0
        if (hit.score > prev) titleBM25.set(doc.url, hit.score)
      }
    }
    for (const v of titleBM25.values()) if (v > maxTitleBM25) maxTitleBM25 = v
  }

  // Stem-aware re-rank: pre-compute per-token stem arrays + per-page stemmed
  // title / haystack / url word sets. Without this, the score function does
  // raw `title.includes("validating")` against a title "Validation" and
  // misses — even though Orama's index hit it via the shared stem ("valid").
  // We use word-equality on stems (not substring) so a title "Tokenomics"
  // doesn't spuriously absorb a "token" query (`includes` did).
  //
  // CRITICAL: each query token is stemmed INDIVIDUALLY (not via joined
  // `tokens.join(" ")`). Orama's English splitter splits on `::`, `@`, `.`
  // (e.g. "op::transfer" → ["op","transfer"]) and may filter empties; a
  // single joined pass produces an array whose length does not match
  // `tokens.length`, breaking positional alignment between `tokens[i]`
  // (raw) and the stem the score loop is meant to compare. Per-token
  // stemming keeps the i-th stem(s) attached to the i-th raw token.
  type StemEntry = {
    titleWords: Set<string>
    haystackWords: Set<string>
    urlWords: Set<string>
    titleStr: string
  }
  let tokenStems: string[][] = []
  let stemmedQueryStr = ""
  const stemCache = new Map<string, StemEntry>()
  // Stem cache is computed only for the K candidates most likely to land in
  // the visible top of the page list. The re-rank bonuses cap at ~10 per
  // group; pages further than ~25 down the BM25-ordered candidate set are
  // very unlikely to reach the visible top from a +10 boost, so paying for
  // 100+ stem calls is wasted work. We over-shoot K relative to the visible
  // ~5–10 to keep tiebreak quality.
  const STEM_TOP_K = 32
  if (tuning.stemReRank) {
    tokenStems = await Promise.all(tokens.map(t => stemString(t)))
    stemmedQueryStr = tokenStems.flat().join(" ")
    const topGroups = [...groups.entries()]
      .sort((a, b) => b[1].bm25 - a[1].bm25)
      .slice(0, STEM_TOP_K)
    await Promise.all(
      topGroups.map(async ([pageId, g]) => {
        const t = (g.page.content ?? "").toLowerCase()
        const bc = (g.page.breadcrumbs ?? []).join(" ").toLowerCase()
        // Split URL on slashes / hyphens / underscores so the stemmer sees real
        // words, not a single slug-soup token.
        const u = g.page.url.toLowerCase().replace(/[/\-_#]+/g, " ").trim()
        const [tw, hw, uw] = await Promise.all([
          stemString(t),
          stemString(`${t} ${bc} ${u}`),
          stemString(u),
        ])
        stemCache.set(pageId, {
          titleWords: new Set(tw),
          haystackWords: new Set(hw),
          urlWords: new Set(uw),
          titleStr: tw.join(" "),
        })
      }),
    )
  }

  const symbolTokens = tokens.filter(querySymbolLike)

  // Per-token IDF multipliers. Cheap: one zero-limit Orama search per
  // unique token to pull the row-level count. log((maxDf+1)/(df+1)) is
  // monotonic in rarity; clamped to [0.5, 2.5] so a single rare token
  // can't dominate the rerank. Computed once per query, not per group.
  const idfWeights = new Map<string, number>()
  if (tuning.idfWeightTokens) {
    const dfPairs = await Promise.all(
      tokens.map(async t => {
        const r = (await search(db, {
          term: t,
          tolerance: 0,
          properties: ["content"],
          limit: 0,
        })) as unknown as {count?: number}
        return [t, r.count ?? 0] as [string, number]
      }),
    )
    let maxDf = 0
    for (const [, df] of dfPairs) if (df > maxDf) maxDf = df
    for (const [t, df] of dfPairs) {
      const raw = Math.log((maxDf + 1) / (df + 1))
      idfWeights.set(t, Math.max(0.5, Math.min(2.5, raw)))
    }
  }

  const score = ({page, hits, bm25}: Grouped): number => {
    const title = (page.content ?? "").toLowerCase()
    const haystack = `${title} ${(page.breadcrumbs ?? []).join(" ")} ${page.url}`.toLowerCase()
    const url = page.url.toLowerCase()
    const sm = tuning.stemReRank ? stemCache.get(String(page.id)) : undefined
    let s = 0
    // Each surface (haystack/title/url) earns at most one bonus per token.
    // Stem-aware match wins; raw `includes` is the fallback so the lever can't
    // strictly regress recall on tokens the stemmer drops (single chars,
    // pure numerics) or doesn't normalize.
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const stems = sm ? tokenStems[i] ?? [] : []
      const stemHay = sm && stems.some(st => sm.haystackWords.has(st))
      const stemTitle = sm && stems.some(st => sm.titleWords.has(st))
      const stemUrl = sm && stems.some(st => sm.urlWords.has(st))
      const idf = tuning.idfWeightTokens ? (idfWeights.get(t) ?? 1) : 1
      if (stemHay || haystack.includes(t)) s += tuning.haystackWeight * idf
      if (stemTitle || title.includes(t)) s += tuning.titleWeight * idf
      if (stemUrl || url.includes(t)) s += tuning.urlWeight * idf
    }
    // Exact / prefix title preference. Substring `includes` ranks the page
    // titled "Wallet" and one titled "How wallets work" identically for the
    // query "wallet"; these bounded bonuses restore the canonical-title
    // preference users expect for navigational / exact intents. Under stem
    // mode, the comparison also fires when the stemmed forms align (e.g.
    // page "Tokens" / query "token", both stem to "token") so morphology
    // doesn't void the canonical-title preference.
    const titleTrim = title.trim()
    // Exact-title also fires on the spell-corrected query form: a user
    // typing "jeton" (which → "jetton" via spell) on a page titled
    // "Jetton" SHOULD earn the exact-title bonus. `queryNorm` is the
    // original typed term (NOT the expanded post-spell token union), and
    // we fall back to the corrected form here so spell correction
    // doesn't accidentally void the bonus it's supposed to enable.
    const titleExact =
      titleTrim === queryNorm ||
      titleTrim === correctedQueryNorm ||
      (sm && sm.titleStr.length > 0 && sm.titleStr === stemmedQueryStr)
    if (tuning.exactTitleWeight > 0 && titleExact) {
      s += tuning.exactTitleWeight
    } else if (
      tuning.titlePrefixWeight > 0 &&
      queryNorm.length > 0 &&
      (title.startsWith(queryNorm) || title.startsWith(correctedQueryNorm))
    ) {
      s += tuning.titlePrefixWeight
    }
    // Calibrated BM25 blend: a continuous relevance signal on top of the
    // coarse integer lexical heuristic. Bounded to [0, bm25Weight] so it
    // separates near-tied pages (the common case — many share the same
    // title/url token hits) without letting a long term-dense page outscore
    // a canonical one on relevance alone (measured to regress if unbounded).
    if (tuning.bm25Weight > 0 && maxBm25 > 0) {
      s += tuning.bm25Weight * (bm25 / maxBm25)
    }
    if (tuning.titleBM25Weight > 0 && maxTitleBM25 > 0) {
      const tb = titleBM25.get(page.url) ?? 0
      if (tb > 0) s += tuning.titleBM25Weight * (tb / maxTitleBM25)
    }
    if (tuning.structHitWeight > 0) {
      // Hand-curated `#Keywords` rows always count. `#Code symbols` rows only
      // count when at least one query token IS itself a symbol-like token (per
      // the same predicate the indexer uses to mine them) — that gate kills
      // the over-firing on natural-language queries (e.g. "wallet", "how to
      // deploy") that wrecked concept intent in the unconditional ablation.
      const curated = hits
        .filter(
          h =>
            h.url.endsWith("#Keywords") ||
            (symbolTokens.length > 0 && h.url.endsWith("#Code symbols")),
        )
        .map(h => (h.content ?? "").toLowerCase())
        .join(" ")
      if (curated) {
        for (const t of tokens) if (curated.includes(t)) s += tuning.structHitWeight
      }
    }
    if (tuning.headingMatchWeight > 0 && tokens.length > 0) {
      // Heading match: per-token bonus when a query token appears in any of
      // this page's heading rows (`type:"heading"`, content = the heading
      // text). Headings are a higher-signal surface than arbitrary body
      // paragraphs — a page with an H2 literally containing the user's
      // words is more likely the canonical answer than a page where the
      // same words appear in passing prose. Phrase-match (queryNorm in
      // heading) gets an extra tokens.length-weighted bonus so a tight
      // phrase hit dominates a scattered token hit. Accept both "heading"
      // (current fumadocs) and "head" (older index versions) to survive a
      // dependency downgrade.
      const headings = hits.filter(h => h.type === "heading" || h.type === "head")
      if (headings.length > 0) {
        let perTokenMatches = 0
        let phraseHit = false
        for (const h of headings) {
          const ht = (h.content ?? "").toLowerCase()
          if (
            !phraseHit &&
            queryNorm.length > 0 &&
            (ht.includes(queryNorm) || ht.includes(correctedQueryNorm))
          ) {
            phraseHit = true
          }
          for (const t of tokens) if (ht.includes(t)) perTokenMatches++
        }
        s += tuning.headingMatchWeight * perTokenMatches
        if (phraseHit) s += tuning.headingMatchWeight * tokens.length
      }
    }
    if (tuning.codeSymbolWeight > 0 && hasCodeShapedToken) {
      // Conditional code-symbol re-rank: fires ONLY when the query itself
      // contains a code-identifier-shaped token, so prose queries cannot
      // activate it (the regression mode of unconditional code-symbol
      // re-ranking). Awards per token, against lowercased symbol bag.
      const codeSyms = hits
        .filter(h => h.url.endsWith("#Code symbols"))
        .map(h => (h.content ?? "").toLowerCase())
        .join(" ")
      if (codeSyms) {
        for (const t of tokens) if (codeSyms.includes(t)) s += tuning.codeSymbolWeight
      }
    }
    if (tuning.allTermsWeight > 0 || tuning.proximityWeight > 0) {
      const snippets = hits.map(h => (h.content ?? "").toLowerCase())
      snippets.push(title)
      let allTerms = false
      let bestSpan = Infinity
      for (const sn of snippets) {
        if (!allTerms && containsAllTokens(sn, tokens)) allTerms = true
        const sp = proximitySpan(sn, tokens)
        if (sp < bestSpan) bestSpan = sp
      }
      if (allTerms) s += tuning.allTermsWeight
      // Tight co-occurrence (terms within ~80 chars) earns the full bonus,
      // decaying to zero by ~400 chars. Bounded so it tunes, not dominates.
      if (bestSpan !== Infinity) {
        const tightness = Math.max(0, 1 - Math.max(0, bestSpan - 80) / 320)
        s += tuning.proximityWeight * tightness
      }
    }
    return s
  }

  // Tiebreak: when the BM25 blend is active, residual score ties resolve by
  // raw relevance (then crawl order); otherwise exact legacy behavior
  // (crawl order only), so bm25Weight=0 is byte-identical to the prior ship.
  const ranked = [...groups.values()]
    .map((g, i) => ({g, i, s: score(g)}))
    .sort((a, b) => b.s - a.s || (tuning.bm25Weight > 0 ? b.g.bm25 - a.g.bm25 : 0) || a.i - b.i)
    .map(x => x.g)

  // Best-bet pin: if any of {raw normalized query, post-stopword term,
  // spell-corrected forms of either} is a curated navigational pin key,
  // move its canonical page to the very top (insert if the crawl missed
  // it). The post-stopword `term` lookup is what lets a natural-language
  // concept query like "what is a wallet" → term "wallet" → hit the
  // `wallet` pin even though the raw normalized form ("what is a wallet")
  // is not a pin key. The corrected forms let a misspelled brand query
  // like "what is a jeton" → "jetton" still resolve.
  const spellOf = (s: string): string =>
    s
      .split(" ")
      .map(w => tuning.spell[w] ?? w)
      .join(" ")
  const pinKeys = [normalized]
  if (term && term !== normalized) pinKeys.push(term)
  if (Object.keys(tuning.spell).length > 0) {
    for (const k of [...pinKeys]) {
      const c = spellOf(k)
      if (c !== k && !pinKeys.includes(c)) pinKeys.push(c)
    }
  }
  let pinnedUrl: string | undefined
  for (const k of pinKeys) {
    if (tuning.pins[k]) {
      pinnedUrl = tuning.pins[k]
      break
    }
  }
  if (pinnedUrl) {
    const idx = ranked.findIndex(g => g.page.url === pinnedUrl)
    if (idx > 0) {
      const [pinned] = ranked.splice(idx, 1)
      ranked.unshift(pinned)
    } else if (idx < 0) {
      const doc = getByID(db, pinnedUrl) as IndexedDoc | undefined
      if (doc) ranked.unshift({page: doc, hits: [], bm25: 0})
    }
  }

  const raw: RawResult[] = []
  for (const {page, hits} of ranked) {
    raw.push({
      id: page.url,
      type: "page",
      content: page.content,
      breadcrumbs: page.breadcrumbs,
      url: page.url,
    })
    for (const doc of hits) {
      raw.push({
        id: String(doc.id),
        // Index stores "head"; fumadocs' SortedResult/UI expects "heading".
        type: doc.type === "head" ? "heading" : doc.type,
        content: doc.content,
        breadcrumbs: doc.breadcrumbs,
        url: doc.url,
      })
    }
    if (raw.length >= MAX_RESULTS) break
  }

  return {term, results: raw.slice(0, MAX_RESULTS)}
}
