import path from 'node:path';
import { generateFiles } from 'fumadocs-openapi';
import { createOpenAPI } from 'fumadocs-openapi/server';

/**
 * @type {Omit<import('fumadocs-openapi').Config, 'input' | 'output'>}
 */
const commonConfig = {
  frontmatter: () => ({ noindex: true }),
  includeDescription: true,
  addGeneratedComment: true,
  beforeWrite: (files) => files.forEach(file => file.content += '\n'),
};

/**
 * @param name {string}
 */
const commonNameTransform = (name) => (name
  .toLocaleLowerCase()
  .replace(/[^a-z0-9\s\-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '')
);

const genV2 = async () => await generateFiles({
  ...commonConfig,
  input: createOpenAPI({
    // NOTE: Key here must match the one used in .github/scripts/generate-openapi-pages.mjs
    input: () => ({ 'v2': path.resolve('./content/ecosystem/api/toncenter/v2.json') })
  }),
  output: path.resolve('./content/ecosystem/api/toncenter/v2'),
  per: 'operation',
  groupBy: 'tag',
  name: (path) => commonNameTransform(path.info.title),
});

const genV3 = async () => await generateFiles({
  ...commonConfig,
  input: createOpenAPI({
    // NOTE: Key here must match the one used in .github/scripts/generate-openapi-pages.mjs
    input: () => ({ 'v3': path.resolve('./content/ecosystem/api/toncenter/v3.yaml') })
  }),
  output: path.resolve('./content/ecosystem/api/toncenter/v3'),
  per: 'operation',
  groupBy: 'tag',
  name: (path) => commonNameTransform(path.info.title),
});

const genSmcIndex = async () => await generateFiles({
  ...commonConfig,
  input: createOpenAPI({
    // NOTE: Key here must match the one used in .github/scripts/generate-openapi-pages.mjs
    input: () => ({ 'smc-index': path.resolve('./content/ecosystem/api/toncenter/smc-index.json') })
  }),
  output: path.resolve('./content/ecosystem/api/toncenter/smc-index'),
  per: 'operation',
  groupBy: 'none',
  name: (path) => commonNameTransform(path.info.title),
});

await genV2();
await genV3();
await genSmcIndex();
