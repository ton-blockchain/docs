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
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
// Common
import { prefix, outDir, isGitHubPagesBuild, getConfig, getRedirects } from './common.mjs';

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
  if (!existsSync(llms)) return { files: 0 };
  let files = 0;
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
    }
  };

  walk(llms);
  return { files };
};

/** @param {string} dir */
const main = (dir) => {
  const pfx = 'post-build:';
  console.log(pfx, 'generating sibling LLM markdown files...');
  const { files: mdFiles } = generateSiblingMarkdownFiles(dir);
  console.log(pfx, `${mdFiles} markdown files`);

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
