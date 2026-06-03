import { writeFileSync } from 'node:fs';
import * as z from 'zod';

/**
 * This is a more sophisticated and _documented_ version of the schema supplied with Fumadocs.
 */
const metaSchema = z.object({
  /** Name of the folder in the sidebar (page tree on the left) */
  title: z.string().optional().describe('Name of the folder in the sidebar (page tree on the left)'),

  /** Icon of the folder in the sidebar (page tree on the left) */
  icon: z.string().optional().describe('Icon of the folder in the sidebar (page tree on the left)'),

  /**
   * When set to `true`, only the items in this folder will be shown when navigating to them.
   *
   * Root folders form the layout tabs (or dropdown) menu: https://www.fumadocs.dev/docs/ui/layouts/docs#layout-tabs
   */
  root: z.boolean().optional().describe([
    'When set to `true`, only the items in this folder will be shown when navigating to them.',
    '\nRoot folders form the layout tabs (or dropdown) menu: https://www.fumadocs.dev/docs/ui/layouts/docs#layout-tabs'
  ].join(' ')),

  /**
   * When set to `true`, the folder will be opened by default.
   *
   * Defaults to `false`.
   */
  defaultOpen: z.boolean().default(false).optional().describe([
    'When set to `true`, the folder will be opened by default.',
    '\nDefaults to `false`.'
  ].join(' ')),

  /**
   * When set to `false`, the folder will **not** be collapsible.
   *
   * Defaults to `true`.
   */
  collapsible: z.boolean().default(true).optional().describe([
    'When set to `false`, the folder will **not** be collapsible.',
    '\nDefaults to `true`.'
  ].join(' ')),

  /**
   * When a folder has an `index.mdx` file, clicks on the folder
   * in the sidebar (page tree on the left) route to that page
   * in addition to toggling the collapsible state of the folder.
   *
   * This field allows to specify a different index item of a folder as either:
   * - Path — a string like `"overview"` (will look for `overview.mdx`)
   * - Link — an external path like `"[Link name](https://yourmom.zip)"`
   */
  pagesIndex: z.union([
    z.string(),
    z.stringFormat('Link', /^\[.*?\]\(http.*?\)$/),
  ]).default('index').optional().describe([
    'When a folder has an `index.mdx` file, clicks on the folder',
    '\nin the sidebar (page tree on the left) route to that page',
    '\nin addition to toggling the collapsible state of the folder.',
    '\n',
    'This field allows to specify a different index item of a folder as either:',
    '\n- Path — a string like `"overview"` (will look for `overview.mdx`)',
    '\n- Link — an external path like `"[Link name](https://yourmom.zip)"`',
  ].join(' ')),

  /**
   * Description of the folder in the sidebar (page tree on the left).
   * Directly related to the index item set in the `pagesIndex` field.
   */
  description: z.string().optional().describe([
    'Description of the folder in the sidebar (page tree on the left).',
    '\nDirectly related to the index item set in the `pagesIndex` field.',
  ].join(' ')),

  /**
   * Array of pages in the folder.
   * Items in the folder appear or disappear (see `"!file"`) in their listed order.
   *
   * The following example documents available options and syntaxes for listing:
   *
   * ```jsonc
   * {
   *   "pages": [
   *     // A path to page or folder. File extensions are allowed, but discouraged.
   *     "components",
   *
   *     // Exclude an item from being included in a folder.
   *     "!file",
   *
   *     // A vertical separator between sections which can be prefixed with an [Icon] from Lucide.
   *     "---My Separator---",
   *
   *     // Include the rest of the pages in alphabetical order.
   *     "...",
   *
   *     // Include the rest of the pages in reverse-alphabetical order.
   *     "z...a",
   *
   *     // Extract the items from a folder below.
   *     "...folder"
   *
   *     // Insert a link. Can be prefixed with an [Icon] from Lucide.
   *     "[TON Docs](https://docs.ton.org)",
   *     "[Triangle][TON Docs](https://docs.ton.org)"
   *
   *     // Insert a link marked as external — it will have a special icon shown to the left of the name.
   *     "external:[TON website](https://ton.org)"
   *   ]
   * }
   * ```
   */
  pages: z.array(z.union([
    z.stringFormat('Path', /^[\.a-zA-Z_\-0-9 \/]+$/),
    z.stringFormat('Separator', /^---(\[[a-zA-Z_\-0-9]+\])?[^\-]+---$/),
    z.stringFormat('Link', /^(external:)?(\[[a-zA-Z_\-0-9]+\])?\[.*?\]\(.*?\)$/),
    z.stringFormat('External link', /^external:\[.*?\]\(.*?\)$/),
    z.stringFormat('Rest', /^\.\.\.$/),
    z.stringFormat('Reversed rest', /^z\.\.\.a$/),
    z.stringFormat('Extract', /^\.\.\.[a-zA-Z_\-0-9 \.]+$/),
    z.stringFormat('Except', /^\![a-zA-Z_\-0-9 \.]+$/),
  ])).optional().describe([
    'Array of pages in the folder.',
    '\nItems in the folder appear or disappear (see `"!file"`) in their listed order.',
    '\n',
    '\nThe following example documents available options and syntaxes for listing:',
    '\n',
    '\n```jsonc',
    '\n{',
    '\n  "pages": [',
    '\n    // A path to page or folder. File extensions are allowed, but discouraged.',
    '\n    "components",',
    '\n',
    '\n    // Exclude an item from being included in a folder.',
    '\n    "!file",',
    '\n',
    '\n    // A vertical separator between sections which can be prefixed with an [Icon] from Lucide.',
    '\n    "---My Separator---",',
    '\n',
    '\n    // Include the rest of the pages in alphabetical order.',
    '\n    "...",',
    '\n',
    '\n    // Include the rest of the pages in reverse-alphabetical order.',
    '\n    "z...a",',
    '\n',
    '\n    // Extract the items from a folder below.',
    '\n    "...folder"',
    '\n',
    '\n    // Insert a link. Can be prefixed with an [Icon] from Lucide.',
    '\n    "[TON Docs](https://docs.ton.org)",',
    '\n    "[Triangle][TON Docs](https://docs.ton.org)"',
    '\n',
    '\n    // Insert a link marked as external — it will have a special icon shown to the left of the name.',
    '\n    "external:[TON website](https://ton.org)"',
    '\n  ]',
    '\n}',
    '\n```',
  ].join(' ')),
});

const metaJsonSchema = z.toJSONSchema(metaSchema);
writeFileSync('../../meta-schema.json', JSON.stringify(metaJsonSchema), { encoding: 'utf8' });
console.log('Written JSON Schema for `meta.json` files as `meta-schema.json` in the repo root.');
// console.log(metaJsonSchema);
