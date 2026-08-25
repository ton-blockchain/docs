// WARN: it is reused by both .ts and .mjs files, so it shall stay .mjs!
import { pluginPT15 } from '@zbsearch/plugin-pt15';
import { create } from 'zbsearch';

export const cfSearchFormat = 'ton-docs-search-v1';
export const cfSearchSchema = /** @type {const} */ ({
  content: 'string',
  page_group: 'number',
});

export function createCfSearchDB() {
  return create({
    schema: cfSearchSchema,
    sort: { enabled: false },
    language: 'multilingual',
    plugins: [pluginPT15()],
  });
}
