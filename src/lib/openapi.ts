import path from 'node:path';
import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  // NOTE: Keys here must match the keys used in .github/scripts/generate-openapi-pages.mjs
  input: {
    v2: path.resolve('./content/api/v2.json'),
    v3: path.resolve('./content/api/v3.yaml'),
  },
});
