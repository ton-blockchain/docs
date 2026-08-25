/*─────────────────────────────────────────────────────────────────────────────╗
│                                  IMPORTANT:                                  │
│  Run this script from the root of the docs, not from the scripts directory!  │
╞══════════════════════════════════════════════════════════════════════════════╡
│  This is a post-build script that augments the compiled files in `out/`      │
│  For example, it adds a `prefix` (see below) to all links without that       │
│  prefix yet. Such replacements are only run when doing a GitHub Pages build. │
│                                                                              │
│  Command to run the script:                                                  │
│  $ GITHUB_PAGES=true node scripts/post-build.mjs                             │
╚─────────────────────────────────────────────────────────────────────────────*/

// ZBSearch
import { insertMultiple, save } from 'zbsearch';
// Node.js
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
// Common
import {
  prefix,
  outDir,
  isGitHubPagesBuild,
  isCloudflarePagesBuild,
  getConfig,
  getRedirects,
} from './common.mjs';
// Cloudflare search-specific
import { cfSearchFormat, createCfSearchDB } from '../src/lib/cf-search-schema.mjs';

/** @param {string} exportPath */
const optimizeSearchIndex = async (exportPath) => {
  const maxSearchBytes = 25 * 1024 * 1024;
  const documentTypes = new Set(['page', 'heading', 'text']);
  const sourceText = readFileSync(exportPath, 'utf8');
  const source = JSON.parse(sourceText);
  const storedDocuments = source?.docs?.docs;
  if (source?.type !== 'advanced' || !storedDocuments) {
    throw new Error(`Unexpected Fumadocs search export at ${exportPath}`);
  }

  const sourceDocuments = Object.values(storedDocuments);
  for (const document of sourceDocuments) {
    if (
      typeof document.id !== 'string' ||
      typeof document.page_id !== 'string' ||
      typeof document.content !== 'string' ||
      typeof document.url !== 'string' ||
      !documentTypes.has(document.type)
    ) {
      throw new Error(`Invalid search document in ${exportPath}`);
    }
  }

  const pageIds = [...new Set(sourceDocuments.map((document) => document.page_id))];
  const pageGroups = new Map(pageIds.map((pageId, index) => [pageId, index]));
  const documents = sourceDocuments.map((document) => ({
    id: document.id,
    content: document.content,
    page_group: pageGroups.get(document.page_id),
    type: document.type,
    url: document.url,
    ...(Array.isArray(document.breadcrumbs) ? { breadcrumbs: document.breadcrumbs } : {}),
  }));

  const database = createCfSearchDB();
  await insertMultiple(database, documents);
  const outputText = `${JSON.stringify({
    ...save(database),
    type: 'advanced',
    format: cfSearchFormat,
    pageIds,
  })}\n`;
  const outputBytes = Buffer.byteLength(outputText);

  if (outputBytes > maxSearchBytes) {
    throw new Error(
      `Search index is ${(outputBytes / 1024 / 1024).toFixed(2)} MiB; ` +
        `Cloudflare Pages allows at most 25 MiB`,
    );
  }

  writeFileSync(exportPath, outputText);
  return {
    sourceBytes: Buffer.byteLength(sourceText),
    outputBytes,
    documents: documents.length,
    pages: pageIds.length,
  };
};

/**
 * @param {string} path - file path
 * @param {string} data - file contents
 */
const writeFileWithDirs = (path, data) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, { encoding: 'utf8' });
};

/** @param {string} path */
const rewrite = (path) => {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path.startsWith(prefix + '/') || path === prefix) return path;
  return prefix + path;
};

/** @param {string} text */
const prefixUrls = (text) => {
  const attrPattern = /\b(src|poster|darkSrc)=(["'])(\/(?:videos)\/(?!\/)[^"']*)\2/g;
  const doubleQuoteAttrPattern = /\b(src|poster|darkSrc)":"(\/(?:videos)\/(?!\/)[^"]*)"/g;
  const cssUrlPattern = /url\((["']?)(\/(?:videos)\/(?!\/)[^)"']*)\1\)/g;
  // NOTE: only for api/search?
  const specAttrPattern = /\b(src|poster|darkSrc)(\\["']):\2(\/(?:videos)\/(?!\/)[^\\"']*)\2/g;
  let replacements = 0;
  const next = text
    .replace(attrPattern, (match, attr, quote, path) => {
      const rewritten = rewrite(path);
      if (rewritten === path) return match;
      replacements += 1;
      return `${attr}=${quote}${rewritten}${quote}`;
    })
    .replace(doubleQuoteAttrPattern, (match, attr, path) => {
      const rewritten = rewrite(path);
      if (rewritten === path) return match;
      replacements += 1;
      return `${attr}":"${rewritten}"`;
    })
    .replace(specAttrPattern, (match, attr, quote, path) => {
      const rewritten = rewrite(path);
      if (rewritten === path) return match;
      replacements += 1;
      return `${attr}${quote}:${quote}${rewritten}${quote}`;
    })
    .replace(cssUrlPattern, (match, quote, path) => {
      const rewritten = rewrite(path);
      if (rewritten === path) return match;
      replacements += 1;
      return `url(${quote}${rewritten}${quote})`;
    });
  return { text: next, replacements };
};

/** @param {string} dir */
const prefixAssetLinks = (dir) => {
  /** @type {{ files: number; replacements: number }} */
  const stats = { files: 0, replacements: 0 };
  // NOTE: never edit .css?
  const exts = new Set(['.html', '.txt', '.js', '.md']);

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = prefixAssetLinks(path);
      stats.files += nested.files;
      stats.replacements += nested.replacements;
      continue;
    }
    if (!entry.isFile() || !exts.has(extname(entry.name))) continue;

    const original = readFileSync(path, 'utf8');
    const { text, replacements } = prefixUrls(original);
    if (replacements === 0) continue;

    writeFileSync(path, text);
    stats.files += 1;
    stats.replacements += replacements;
  }

  return stats;
};

/** @param {string} dir */
const generateStaticRedirects = (dir) => {
  /** @type {{ redirects: number }} */
  const stats = { redirects: 0 };
  const reds = getRedirects(getConfig());
  /**
   * @param {string} a
   * @param {string} b
   */
  const compose = (a, b) =>
    a.replace(/\/+$/, '') + '/' + b.replace(/^\/+/, '').replace(/\.(?:html|mdx?)$/, '');
  for (const red of reds) {
    if (
      red.destination.startsWith('http') ||
      red.destination.startsWith('TODO') ||
      red.destination.endsWith('/:slug*')
    ) {
      continue;
    }
    const path = compose(dir, red.source) + '.html';
    const dest = compose(prefix, red.destination);
    // console.log('Creating', path, 'that leads to', dest);
    writeFileWithDirs(
      path,
      `
      <!doctype html>
        <title>Redirecting to: ${dest}</title>
        <meta httpEquiv="refresh" content="0;url=${dest}" />
        <meta name="robots" content="noindex, follow" />
      </html>
      `,
    );
    stats.redirects += 1;
  }

  return stats;
};

/** @param {string} dir */
const generateSiblingMarkdownFiles = (dir) => {
  const llms = join(dir, 'llms');
  if (!existsSync(llms)) return { files: 0, routes: [] };
  let files = 0;
  /** @type {string[]} */
  let routes = [];
  /** @param {string} cur */
  const walk = (cur) => {
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const path = join(cur, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || entry.name !== 'content.md') continue;
      const route = cur.slice(llms.length).replace(/^\/+/, ''); // or `dirname(path)` in place of `cur`
      const target = join(dir, `${route}.md`);
      const html = join(dir, `${route}.html`);
      if (!existsSync(html)) continue;
      writeFileWithDirs(target, readFileSync(path, 'utf8'));
      files += 1;
      routes.push(route);
    }
  };

  walk(llms);
  return { files, routes };
};

/**
 * @param {string} dir
 * @param {string[]} [mdRoutes]
 */
const generateCloudflareRedirects = (dir, mdRoutes) => {
  const redirects = getRedirects(getConfig()).map((it) => {
    const { source, destination, permanent } = it;
    if (/\s/.test(source) || /\s/.test(destination)) {
      throw new Error(`Redirect must not contain whitespaces: "${source}" → "${destination}"`);
    }
    return `${source} ${destination} ${permanent === false ? 307 : 308}`;
  });
  // WARN: must map to same routes as `"rewrites"` produces in in vercel.json
  const rewrites = (mdRoutes ?? [])
    .filter((route) => /^(?:llms|og|api|_next)(?:\/|$)/.test(route) === false)
    .map((route) => `/${route}.md /llms/${route}/content.md 200`);
  const lines = [...redirects, ...rewrites];
  if (lines.length > 2000) {
    throw new Error(`At most 2000 static redirects allowed, got ${lines.length}`);
  }
  writeFileWithDirs(join(dir, '_redirects'), lines.join('\n') + '\n');
  return { redirects, rewrites };
};

/** @param {string} dir */
const generateCloudflareHeaders = (dir) => {
  const rules = getConfig().headers ?? [];
  /** @type {string[]} */
  let lines = [];
  /** @type {{source: string, key: string, value: string}[]} */
  let headers = [];
  for (const rule of rules) {
    const { source, headers: ruleHeaders } = rule;
    if (!source || /[\s]/.test(source)) {
      throw new Error(`Header source is missing or contains whitespaces: "${source}"`);
    }
    lines.push(source);
    for (const header of ruleHeaders ?? []) {
      const { key, value } = header;
      if (!key || value === undefined || /[\r\n]/.test(String(value))) {
        throw new Error(`Header key-value pair is invalid for the ${source} source`);
      }
      lines.push(`  ${key}: ${value}`);
      headers.push({ source, key, value });
    }
    lines.push('');
  }
  writeFileWithDirs(join(dir, '_headers'), lines.join('\n').trimEnd() + '\n');
  return { headers };
};

/** @param {string} dir */
const main = async (dir) => {
  const pfx = 'post-build:';
  console.log(pfx, 'generating sibling LLM markdown files...');
  const { files: mdFiles, routes: mdRoutes } = generateSiblingMarkdownFiles(dir);
  console.log(pfx, `${mdFiles} markdown files`);

  if (!isCloudflarePagesBuild) {
    console.log(pfx, 'skipped Cloudflare Pages-only steps');
  } else {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      console.log(pfx, `skipped — ${dir}/ directory not found`);
      process.exit(1);
    }

    console.log(pfx, 'optimizing Cloudflare static search index...');
    const search = await optimizeSearchIndex(join(dir, 'api/search'));
    console.log(
      pfx,
      `${search.documents} documents, ${search.pages} pages, ` +
        `${search.sourceBytes} -> ${search.outputBytes} bytes`,
    );

    console.log(pfx, `generating Cloudflare Pages _redirects...`);
    const { redirects, rewrites } = generateCloudflareRedirects(dir, mdRoutes);
    console.log(
      pfx,
      `${redirects.length} redirects, ${rewrites.length} rewrites (proxying redirects)`,
    );
    console.log();
    console.log(pfx, `generating Cloudflare Pages _headers...`);
    const { headers } = generateCloudflareHeaders(dir);
    console.log(pfx, `${headers.length} headers key-value pairs`);
  }

  if (!isGitHubPagesBuild) {
    console.log(pfx, 'skipped GitHub Pages-only steps');
  } else {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      console.log(pfx, `skipped — ${dir}/ directory not found`);
      process.exit(1);
    }

    console.log(pfx, `prefixing links for <video> files...`);
    const { files, replacements } = prefixAssetLinks(dir);
    console.log(pfx, `${files} files, ${replacements} replacements`);
    console.log();
    console.log(pfx, `generating static http-refresh redirects...`);
    const { redirects } = generateStaticRedirects(dir);
    console.log(pfx, `${redirects} redirects`);
  }
};

await main(outDir);
