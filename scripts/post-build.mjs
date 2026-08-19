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

// Node.js
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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
const generateCloudflareRedirects = (dir, markdownRoutes = []) => {
  const redirects = getRedirects(getConfig()).map((redirect) => {
    const { source, destination, permanent } = redirect;
    if (/\s/.test(source) || /\s/.test(destination)) {
      throw new Error(`Cloudflare redirect contains whitespace: ${source} → ${destination}`);
    }
    return `${source} ${destination} ${permanent === false ? 307 : 301}`;
  });
  const markdownRewrites = markdownRoutes
    .filter((route) => !/^(?:llms|og|api|_next)(?:\/|$)/.test(route))
    .map((route) => `/${route}.md /llms/${route}/content.md 200`);
  const lines = [...redirects, ...markdownRewrites];

  if (lines.length > 2000) {
    throw new Error(`Cloudflare _redirects has ${lines.length} static rules; the limit is 2000`);
  }

  writeFileWithDirs(join(dir, '_redirects'), `${lines.join('\n')}\n`);
  return { redirects: redirects.length, rewrites: markdownRewrites.length };
};

/** @param {string} dir */
const generateCloudflareRoutes = (dir) => {
  const routes = {
    version: 1,
    include: ['/api/search', '/api/search/*'],
    exclude: [],
  };

  writeFileWithDirs(join(dir, '_routes.json'), `${JSON.stringify(routes, null, 2)}\n`);
};

const cloudflareSearchShards = [...'abcdefghijklmnopqrstuvwxyz', 'digits', 'other'];

/** @param {string} term */
const getCloudflareSearchShard = (term) => {
  const first = term[0] ?? '';
  if (/^[a-z]$/.test(first)) return first;
  if (/^[0-9]$/.test(first)) return 'digits';
  return 'other';
};

/** @param {string} value */
const getSearchTokens = (value) =>
  [
    ...new Set(
      value
        .normalize('NFKC')
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ].filter((token) => token.length > 1);

/** @param {string} dir */
const generateCloudflareSearchIndex = (dir) => {
  const sourcePath = join(dir, 'search-index');
  if (!existsSync(sourcePath)) {
    throw new Error(`Cloudflare search index source is missing: ${sourcePath}`);
  }

  const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  /** @type {Record<string, { id: string; url: string; title: string; description?: string; excerpt?: string }>} */
  const documents = Object.create(null);
  /** @type {Map<string, { version: number; terms: Record<string, string[]> }>} */
  const shards = new Map(
    cloudflareSearchShards.map((shard) => [shard, { version: 1, terms: Object.create(null) }]),
  );

  for (const document of source.documents ?? []) {
    const text = String(document.text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    documents[document.id] = {
      id: document.id,
      url: document.url,
      title: document.title,
      ...(document.description ? { description: document.description } : {}),
      ...(text ? { excerpt: text.slice(0, 240) } : {}),
    };

    const searchableText = [document.title, document.description, document.text]
      .filter(Boolean)
      .join(' ');
    for (const token of getSearchTokens(searchableText)) {
      const shard = shards.get(getCloudflareSearchShard(token));
      if (!shard) continue;
      const posting = shard.terms[token] ?? [];
      posting.push(document.id);
      shard.terms[token] = posting;
    }
  }

  // Next's static route creates this temporary, full-text JSON file. Replace it
  // with the small catalog plus token shards consumed by the Pages Function.
  unlinkSync(sourcePath);
  writeFileWithDirs(
    join(dir, 'search-index', 'documents'),
    `${JSON.stringify({ version: 1, documents })}\n`,
  );
  for (const [shardName, shard] of shards) {
    writeFileWithDirs(join(dir, 'search-index', shardName), `${JSON.stringify(shard)}\n`);
  }

  return {
    documents: Object.keys(documents).length,
    shards: shards.size,
  };
};

/** @param {string} dir */
const generateSiblingMarkdownFiles = (dir) => {
  const llms = join(dir, 'llms');
  if (!existsSync(llms)) return { files: 0, routes: [] };
  let files = 0;
  const routes = [];
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

/** @param {string} dir */
const main = (dir) => {
  const pfx = 'post-build:';
  console.log(pfx, 'generating sibling LLM markdown files...');
  const { files: mdFiles, routes: markdownRoutes } = generateSiblingMarkdownFiles(dir);
  console.log(pfx, `${mdFiles} markdown files`);

  if (isCloudflarePagesBuild) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      console.log(pfx, `skipped — ${dir}/ directory not found`);
      process.exit(1);
    }

    console.log(pfx, 'generating Cloudflare Pages _redirects...');
    const { redirects, rewrites } = generateCloudflareRedirects(dir, markdownRoutes);
    console.log(pfx, `${redirects} redirects, ${rewrites} markdown rewrites`);

    console.log(pfx, 'limiting Cloudflare Pages Functions to /api/search...');
    generateCloudflareRoutes(dir);

    console.log(pfx, 'compacting Cloudflare search index into token shards...');
    const searchIndex = generateCloudflareSearchIndex(dir);
    console.log(pfx, `${searchIndex.documents} documents, ${searchIndex.shards} shards`);
  }

  if (!isGitHubPagesBuild) {
    console.log(pfx, 'skipped GitHub Pages-only steps');
    process.exit(0);
  }

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
};

main(outDir);
