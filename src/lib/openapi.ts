import path from 'node:path';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { createCodeUsageGeneratorRegistry } from 'fumadocs-openapi/requests/generators';
import { registerDefault } from 'fumadocs-openapi/requests/generators/all';

export const openapi = createOpenAPI({
  // NOTE: Keys here must match the keys used in .github/scripts/generate-openapi-pages.mjs
  input: () => ({
    v2: path.resolve('./content/ecosystem/api/toncenter/v2.json'),
    v3: path.resolve('./content/ecosystem/api/toncenter/v3.yaml'),
    'smc-index': path.resolve(
      './content/ecosystem/api/toncenter/smc-index.json',
    ),
  }),
});

// See: https://www.fumadocs.dev/docs/integrations/openapi/api-page#generate-code-usages
export const codeUsages = createCodeUsageGeneratorRegistry();
registerDefault(codeUsages);

// NOTE: Custom generators
// codeUsages.add('custom-id', {
//   label: 'My Example',
//   lang: 'js',
//   generate(url, data, { mediaAdapters }) {
//     // request data
//     console.log(url, data);
//     return 'const response = "hello world";';
//   },
// });
