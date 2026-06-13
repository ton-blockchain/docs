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
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
// Common
import { prefix, outDir, isGitHubPagesBuild, getConfig, getRedirects } from './common.mjs';

/** @param {string} path */
const rewrite = (path) => {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path.startsWith(prefix + '/') || path === prefix) return path;
  return prefix + path;
};

/** @param {string} text */
const prefixUrls = (text) => {
  const attrPattern = /\b(src|href|poster|darkSrc)=(["'])(\/(?!\/)[^"']*)\2/g;
  const specAttrPattern = /\b(src|href|poster|darkSrc)(\\["']):\2(\/(?!\/)[^"']*)\2/g;
  const cssUrlPattern = /url\((["']?)(\/(?!\/)[^)"']*)\1\)/g;
  let replacements = 0;
  const next = text
    .replace(attrPattern, (match, attr, quote, path) => {
      const rewritten = rewrite(path);
      if (rewritten === path) return match;
      replacements += 1;
      return `${attr}=${quote}${rewritten}${quote}`;
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
  const exts = new Set(['.html', '.js', '.css', '.md', '.txt']);

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

  for (const red of reds) {
    // take the source, take the destination, write the html
    red.source;
    stats.redirects += 1;
  }

  return stats;
};

const main = () => {
  const pfx = 'post-build:';
  if (!isGitHubPagesBuild) {
    console.log(pfx, 'skipped (not a GitHub Pages build)');
    process.exit(0);
  }

  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
    console.log(pfx, 'skipped — out/ not found');
    process.exit(1);
  }

  console.log(pfx, `prefixing links...`);
  const { files, replacements } = prefixAssetLinks(outDir);
  console.log(pfx, `${files} files, ${replacements} replacements`);
  console.log();
  console.log(pfx, `generating static http-refresh redirects...`);
  const { redirects } = generateStaticRedirects(outDir);
  console.log(pfx, `${redirects} redirects`);
};

main();
