import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from "zod";
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { rehypeCodeDefaultOptions, remarkMdxMermaid, remarkMdxFiles, } from 'fumadocs-core/mdx-plugins';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema.extend({
      description: z.string(),
      sidebarTitle: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "one-light",
        dark: "one-dark-pro",
      },
      lazy: false,
      langs: ['js', 'jsx', 'ts', 'tsx', 'shellscript', 'jsonc', 'json'],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          // langs: ['ts', 'tsx', 'tolk'],
          // twoslasher: tolkTwoslasher,
        })
      ],
    },
    remarkPlugins: [remarkMath, remarkMdxMermaid, remarkMdxFiles],
    // NOTE: KaTeX support should be placed before everything else!
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
