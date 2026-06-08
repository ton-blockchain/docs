/*─────────────────────────────────────────────────────────────────────────────╗
│                                  IMPORTANT:                                  │
│  Run this script from the root of the docs, not from the scripts directory!  │
╞══════════════════════════════════════════════════════════════════════════════╡
│  This is a post-build script that adds a `prefix` (see below) to all         │
│  relevant URLs in `out/` that do not have that prefix yet.                   │
│  Such replacements are only run when doing a GitHub Pages build              │
│  to ensure correct links for the asset (media) files                         │
│                                                                              │
│  Command to run the script:                                                  │
│  $ node scripts/prefix-out-paths.mjs                                         │
╚─────────────────────────────────────────────────────────────────────────────*/

// Node.js
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

// WARN: Must match next.config.static.ts isGitHubPagesBuild
const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_PAGES === 'true';

// WARN: Must match gitConfig.repo in src/lib/shared.ts
const prefix = '/docs';
const outDir = 'out';
const exts = new Set(['.html', '.js', '.css', '.md', '.txt']);

// Regex patterns
const attrPattern = /\b(src|href|poster|darkSrc)=(["'])(\/(?!\/)[^"']*)\2/g;
const specAttrPattern = /\b(src|href|poster|darkSrc)(\\["']):\2(\/(?!\/)[^"']*)\2/g;
const cssUrlPattern = /url\((["']?)(\/(?!\/)[^)"']*)\1\)/g;

/** @param {string} path */
const rewrite = (path) => {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path.startsWith(prefix + '/') || path === prefix) return path;
  return prefix + path;
};

/** @param {string} text */
const prefixUrls = (text) => {
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
const walk = (dir) => {
  /** @type {{ files: number; replacements: number }} */
  const stats = { files: 0, replacements: 0 };

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = walk(path);
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
}

const main = () => {
  if (!isGitHubPagesBuild) {
    console.log('prefix-out-paths: skipped (not a GitHub Pages build)');
    process.exit(0);
  }

  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
    console.log('prefix-out-paths: skipped — out/ not found');
    process.exit(0);
  }

  const { files, replacements } = walk(outDir);
  console.log(`prefix-out-paths: ${files} files, ${replacements} replacements`);
}

main();
