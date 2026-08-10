import path from 'node:path';
import { generateFiles } from '@fumadocs/asyncapi';
import { createAsyncAPI } from '@fumadocs/asyncapi/server';

/**
 * @type {Omit<import('@fumadocs/asyncapi').Config, 'input' | 'output'>}
 */
const commonConfig = {
  frontmatter: (title) => ({
    noindex: true,
    sidebarTitle: title,
  }),
  includeDescription: true,
  addGeneratedComment: true,
  beforeWrite: (files) => files.forEach((file) => (file.content += '\n')),
};

const asyncapi = createAsyncAPI({
  // NOTE: The key must match the one used in src/lib/asyncapi.ts.
  input: {
    streaming: path.resolve('./content/api/streaming.yaml'),
  },
});

await generateFiles({
  ...commonConfig,
  input: asyncapi,
  output: path.resolve('./content/api/streaming'),
  per: 'operation',
  groupBy: 'none',
  name: () => 'wss-events',
});
