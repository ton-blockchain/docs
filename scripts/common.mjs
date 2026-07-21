// Node.js
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Remark
import { remark } from 'remark';
import { visitParents } from 'unist-util-visit-parents';

/**
 * Mintlify
 * @typedef {import('../node_modules/@mintlify/validation').DocsConfig} DocsConfig
 */

/**
 * Docusaurus
 * @typedef {import('./sidebars/sidebars.d.ts').SidebarsConfig} Sidebars
 * @typedef {import('./sidebars/sidebars.d.ts').SidebarItemConfig} SidebarItem
 * @typedef {import('./sidebars/sidebars.d.ts').SidebarItemDoc} ItemDoc
 * @typedef {import('./sidebars/sidebars.d.ts').SidebarItemLink} ItemLink
 * @typedef {import('./sidebars/sidebars.d.ts').SidebarItemCategoryBase} ItemCat
 */

/**
 * Custom
 * @typedef {{ok: true} | {ok: false; error: string}} CheckResult
 */

// WARN: Must match Next.js build output folder
export const outDir = 'out';

// WARN: Must match gitConfig.repo in src/lib/shared.ts
export const prefix = '/docs';

// WARN: Must match next.config.static.ts isGitHubPagesBuild
export const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_PAGES === 'true';

/** @param src {string} */
export function ansiRed(src) {
  return `\x1b[31m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiBoldRed(src) {
  return `\x1b[1;31m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiGreen(src) {
  return `\x1b[32m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiBoldGreen(src) {
  return `\x1b[1;32m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiYellow(src) {
  return `\x1b[33m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiBoldYellow(src) {
  return `\x1b[1;33m${src}\x1b[0m`;
}

/** @param src {string} */
export function ansiBold(src) {
  return `\x1b[1m${src}\x1b[0m`;
}

/**
 * Forms a string with the following contents:
 *
 * ```
 * brief:
 * - list[0]
 * - list[1]
 * - ...
 * - list[n - 1]
 *
 * Error: msg
 * ```
 *
 * @param brief {string} Brief description of list items
 * @param list {string[]} List of inline error messages
 * @param msg {string} Complete description of the error message
 */
export function composeErrorList(brief, list, msg) {
  return [ansiRed(brief), '- ' + list.join('\n- '), `\n${ansiRed('Error:')} ${msg}`].join('\n');
}

/** @param msg {string} */
export function composeError(msg) {
  return `${ansiRed('Error:')} ${msg}`;
}

/**
 * Forms a string with the following contents:
 *
 * ```
 * Warning: msg
 * - list[0]
 * - list[1]
 * - ...
 * - list[n - 1]
 * ```
 *
 * @param msg {string} Complete description of the warning message
 * @param list {string[]} List of inline warning messages
 */
export function composeWarningList(msg, list) {
  return [`${ansiYellow('Warning:')} ${msg}`, '- ' + list.join('\n- ')].join('\n');
}

/** @param msg {string} */
export function composeWarning(msg) {
  return `${ansiYellow('Warning:')} ${msg}`;
}

/** @param msg {string} */
export function composeSuccess(msg) {
  return `${ansiGreen('Success:')} ${msg}`;
}

/** @param src {string} */
export function prefixWithSlash(src) {
  return '/content/' + src.replace(/^\/*(?:content\/+)?/, '');
}

/**
 * Synchronously runs a single command (no pipes!) and returns its exit code.
 * NOTE: Consider making it into a template literal handler.
 *
 * @param command {string}
 * @param [opts] {Options}
 *
 * @typedef Options
 * @property [timeout] {number} seconds, defaults to 60 * 10, i.e., 10 minutes
 * @property [quiet] {boolean} only log errors, defaults to true
 * @property [silent] {boolean} log nothing, defaults to false
 *
 * @returns {{
 *   ok: true,
 *   code: number,
 *   out: string,
 *   lines: (string | null)[]
 * } | {
 *   ok: false,
 *   code: number | null,
 *   error: string | Error
 * }}
 */
export function $(command, opts = { timeout: 60 * 10, quiet: true, silent: false }) {
  const spaced = command.split(' ');
  const result = spawnSync(spaced[0], spaced.slice(1), {
    encoding: 'utf8',
    timeout: 1_000 * (opts.timeout ?? 60 * 10),
  });
  if (result.status != 0) {
    const errMsg = result.error ?? result.stdout + '\n' + result.stderr;
    if (!opts.silent) console.log(errMsg);
    return {
      ok: false,
      code: result.status,
      error: errMsg,
    };
  }
  if (!opts.quiet && !opts.silent) console.log(result.stdout);
  return { ok: true, code: result.status, out: result.stdout, lines: result.output };
}

/**
 * Creates the Remark parser with same settings as in `remarkConfig` inside `package.json`.
 */
export async function initMdxParser() {
  const remarkConfig = (await import(join('..', '.remarkrc.mjs'))).default;
  return remark().use(remarkConfig);
}

/**
 * Checks whether the .mdx page has (uses) a `<Stub>` React component
 * by parsing the contents of the `filepath` with the MDX `parser`
 * and exploring the resulting tree.
 *
 * @param parser {*} initialized Remark parser with MDX support enabled
 * @param filepath {string} relative path to the MDX file
 * @returns {boolean}
 */
export function hasStub(parser, filepath) {
  if (!filepath.endsWith('mdx')) {
    return false;
  }
  const file = readFileSync(filepath, { encoding: 'utf8' });
  const parsed = parser.parse(file);
  let res = false;
  visitParents(parsed, 'mdxJsxFlowElement', (node) => {
    if (node.name === 'Stub') {
      res = true;
    }
  });
  return res;
}

/**
 * Recursively finds files with a target extension `ext` starting from a given directory `dir`.
 * Ignores common and extension-specific irrelevant files — see the code for details.
 *
 * TODO: actually check meta.json files for coverage of real paths.
 *
 * @param [ext='mdx'] {string} extension of the file without a leading dot; defaults to mdx
 * @param [dir='.'] {string} directory to start with, defaults to `.` (present directory, assuming the root of the repo)
 * @returns {string[]} file paths relative to `dir` or an empty array if there is none, `dir` does not exist or `ext` is empty
 */
export function findUnignoredFiles(ext = 'mdx', dir = './content') {
  if (ext === '' || !existsSync(dir) || !statSync(dir).isDirectory()) {
    return [];
  }

  /**
   * `dir`-relative paths to common ignores.
   * @type {{ files: string[]; dirs: string[] }}
   */
  const commonIgnoreMap = Object.freeze({
    files: ['LICENSE-code', 'LICENSE-docs', 'package-lock.json'].map((it) => join(dir, it)),
    dirs: [
      '.git',
      '.github',
      '.idea',
      '.vscode',
      '__MACOSX',
      'node_modules',
      '__pycache__',
      'stats',
    ].map((it) => join(dir, it)),
  });

  /**
   * `dir`-relative paths to extension-specific ignores.
   * @type {{[k: string]: { files: string[]; dirs: string[] }}}
   */
  const extIgnoreMap = Object.freeze({
    mdx: {
      files: ['index.mdx', 'contribute/style-guide-extended.mdx'].map((it) => join(dir, it)),
      dirs: [
        // Snippets and page parts
        ...['snippets', 'scripts', 'public'].map((it) => join(dir, it)),
        // Pages covered in OpenAPI specs rather than in meta.json files
        ...['api/v2', 'api/v3']
          .map((it) => join(dir, it))
          .flatMap((dirWithOverview) =>
            existsSync(dirWithOverview)
              ? readdirSync(dirWithOverview, { withFileTypes: true })
                  .filter((it) => it.isDirectory())
                  .map((it) => join(dirWithOverview, it.name))
              : [],
          ),
        // Does not have an overview:
        join(dir, 'api/smc-index'),
      ],
    },
  });

  /** @type string[] */
  let results = [];

  /** @param subDir {string} */
  const recurse = (subDir) => {
    // Collects files and dirs one level deep, excluding common ignore targets
    const intermediates = readdirSync(subDir, {
      withFileTypes: true,
      encoding: 'utf8',
      recursive: false,
    }).filter((it) => {
      const relPath = join(it.parentPath, it.name);
      if (it.isFile()) {
        return commonIgnoreMap.files.includes(relPath) === false;
      }
      if (it.isDirectory()) {
        return commonIgnoreMap.dirs.includes(relPath) === false;
      }
      // Otherwise
      return false;
    });
    // Processes collected items and filters out extension-specific ignore targets,
    // recursively descending in directories and pushing files into `results` array
    // if they match the target `ext` and are not ignored.
    intermediates.forEach((it) => {
      const relPath = join(it.parentPath, it.name);
      if (it.isFile() && relPath.toLowerCase().endsWith(ext)) {
        // Ignore extension-specific targets
        if (extIgnoreMap.hasOwnProperty(ext) && extIgnoreMap[ext].files.includes(relPath)) {
          return;
        }
        results.push(relPath);
        return;
      }
      if (it.isDirectory()) {
        // Ignore extension-specific targets
        if (extIgnoreMap.hasOwnProperty(ext) && extIgnoreMap[ext].dirs.includes(relPath)) {
          return;
        }
        recurse(relPath);
        return;
      }
      // Otherwise
      return;
    });
  };
  recurse(dir);
  return results;
}

/**
 * Get docs.json contents as an object.
 *
 * @returns {Readonly<DocsConfig>}
 */
export function getConfig() {
  return Object.freeze(JSON.parse(readFileSync('./docs.json', 'utf8')));
}

/**
 * Write docs.json-representing object into docs.json file.
 *
 * @param {Readonly<DocsConfig>} config
 */
export function writeConfig(config) {
  const docsJsonUrl = new URL('../docs.json', import.meta.url);
  writeFileSync(docsJsonUrl, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

/**
 * Get navigation links from the docs.json configuration.
 * Notice that each link is prefixed by 'content' and a single slash /,
 * regardless if the latter was present originally.
 *
 * @deprecated use `getNavLinks()` instead.
 * @param config {DocsConfig}
 * @returns {string[]}
 */
export function getNavLinksFromFile(config) {
  /** @type {string[]} */
  const links = [];
  /** @param page {any} */
  const processPage = (page) => {
    switch (typeof page) {
      case 'string': {
        links.push(prefixWithSlash(page));
        break;
      }
      case 'object': {
        if (page?.pages) {
          page['pages'].forEach(processPage);
        }
        break;
      }
      default:
        break;
    }
  };
  // @ts-ignore
  config.navigation?.pages.forEach(processPage);
  return links;
}

/**
 * Get navigation links from the `content/` directory
 * Notice that each link is prefixed by a single slash /,
 * whether it was present originally or not.
 *
 * @returns {string[]}
 */
export function getNavLinks() {
  return findUnignoredFiles('mdx').map((it) => prefixWithSlash(it.replace(/\.mdx$/i, '')));
}

/**
 * Get navigation links from the meta.json files and content/ folder as a Set.
 * Notice that each link is prefixed by 'content' and a single slash /,
 * regardless if the latter was present originally.
 *
 * @returns {ReadonlySet<string>}
 */
export function getNavLinksSet() {
  return Object.freeze(new Set(getNavLinks()));
}

/**
 * Get redirect objects from the docs.json configuration.
 *
 * @typedef {{
 *   source: string;
 *   destination: string;
 *   permanent?: boolean | undefined
 * }} Redirect
 * @param config {DocsConfig}
 * @returns {Redirect[]}
 */
export function getRedirects(config) {
  if (!config.redirects) {
    return [];
  }
  return config.redirects;
}

/**
 * Get redirect objects from the docs.json configuration as a Set.
 *
 * @param config {DocsConfig}
 * @returns {ReadonlySet<Redirect>}
 */
export function getRedirectsSet(config) {
  return Object.freeze(new Set(getRedirects(config)));
}
