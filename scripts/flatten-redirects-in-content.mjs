/*─────────────────────────────────────────────────────────────────────────────╗
│                                  IMPORTANT:                                  │
│  Run this script from the root of the docs, not from the scripts directory!  │
╞══════════════════════════════════════════════════════════════════════════════╡
│  This script replaces old redirect source links in content/*.mdx files with  │
│  their redirect destinations. It applies one source → destination mapping at │
│  a time, so one can review the git diff after each run.                      │
│                                                                              │
│  Command to run the script:                                                  │
│  $ node scripts/flatten-redirects-in-content.mjs                             │
│                                                                              │
│  To target a specific redirect source:                                       │
│  $ node scripts/flatten-redirects-in-content.mjs /old/path                   │
╚─────────────────────────────────────────────────────────────────────────────*/

// Node.js
import { readFileSync, writeFileSync, globSync } from 'node:fs';

// Common utils
import {
  ansiBold,
  composeSuccess,
  composeWarning,
  findUnignoredFiles,
  getConfig,
  getRedirects,
} from './common.mjs';

/** @param {string} src */
const escapeRegExp = (src) => src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build a regex that only matches link-like uses of a redirect source:
 *
 * - Markdown links:       [text](/old/path)
 * - JSX attributes:       href="/old/path"
 * - Single-quoted values: href='/old/path'
 *
 * It intentionally keeps the opener in a capture group and replaces only the
 * path. Query strings and fragments are preserved because the match stops
 * before `?` and `#`.
 *
 * @param {string} source
 */
const makeSourceRegex = (source) =>
  new RegExp(`(:\\s+|["'(])${escapeRegExp(source)}(?=$|[)"'\\s<>?#])`, 'g');

/**
 * @param {{source: string; destination: string}[]} redirects
 * @param {string | undefined} requestedSource
 */
const selectRedirects = (redirects, requestedSource) => {
  const local = redirects.filter((it) => it.destination.startsWith('/'));
  if (!requestedSource) return local;
  const selected = local.filter((it) => it.source === requestedSource);
  if (selected.length === 0) {
    throw new Error(`No such requested redirect source found: "${requestedSource}"`);
  }
  return selected;
};

/**
 * @param {{source: string; destination: string}} redirect
 * @param {string[]} files
 * @returns {{ file: string; count: number; next: string }[]}
 */
const collectFileChanges = (redirect, files) => {
  const sourceRegex = makeSourceRegex(redirect.source);

  return files.flatMap((file) => {
    const original = readFileSync(file, 'utf8');
    let count = 0;
    const next = original.replace(sourceRegex, (_match, opener) => {
      count += 1;
      return opener + redirect.destination;
    });

    return count === 0 ? [] : [{ file, count, next }];
  });
};

const main = () => {
  const requestedSource = process.argv[2];
  const config = getConfig();
  const redirects = selectRedirects(getRedirects(config), requestedSource);
  // const files = findUnignoredFiles('mdx');
  const files = globSync('content/**/*.mdx');

  let count = 0;
  for (const redirect of redirects) {
    const changes = collectFileChanges(redirect, files);
    if (changes.length === 0) {
      continue;
    }

    console.log(`${ansiBold('Replacing')} ${redirect.source} → ${redirect.destination}`);
    changes.forEach(({ file, next }) => {
      writeFileSync(file, next, 'utf8');
    });

    const replacements = changes.reduce((sum, it) => sum + it.count, 0);
    console.log(composeSuccess(`replaced ${replacements} link(s)`));
    console.log('Touched files:');
    changes.forEach(({ file, count }) => {
      console.log(`- ${file} (${count})`);
    });
    console.log();
    count += 1;
    if (count === 50) {
      console.log(ansiBold('Review with `git diff`, then rerun to process next mappings.'));
      return;
    }
  }

  const scope = requestedSource ? ` for ${requestedSource}` : '';
  console.log(composeWarning(`No matching redirect source links found${scope}.`));
};

main();
