import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from "zod";
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';

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
    remarkPlugins: [remarkMath, remarkMdxMermaid],
    // NOTE: KaTeX support should be placed before everything else!
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
