import { readFileSync } from 'node:fs';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { rehypeCodeDefaultOptions, remarkMdxMermaid, remarkMdxFiles, } from 'fumadocs-core/mdx-plugins';
import { z } from "zod";
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

/** See: https://fumadocs.dev/docs/mdx/collections */
export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema.extend({
      // TODO: temporary patch for OpenAPI pages
      title: z.string().optional(),
      sidebarTitle: z.string().optional(),
      // TODO: try using `full: true` instead, which is a builtin field
      mode: z.enum(['none', 'wide']).default('none'),
      // TODO:
      noindex: z.coerce.boolean().default(false),
      // TODO:
      openapi: z.string().optional(),
      // TODO: fmt with prettier for everything but md[x]
    }).transform((frontmatter) => ({
      ...frontmatter,
      // NOTE: alternatively, give titles to all OpenAPI routes
      title: frontmatter.title ?? frontmatter.openapi ?? 'Untitled',
    })),
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
        // NOTE: one-light and one-dark-pro are alternative options
        light: "github-light-default",
        dark: "dark-plus",
      },
      icon: {
        extend: {
          tolk: readFileSync('./public/logo/ton-gray.svg', 'utf8'),
        },
      },
      lazy: false,
      langs: [
        'console',
        'cpp',
        'd',
        'diff',
        'http',
        'ini',
        'json',
        'jsonc',
        'js',
        'jsx',
        'go',
        'mdx',
        'html',
        'swift',
        'kotlin',
        'python',
        'rust',
        'shellscript',
        'ts',
        'tsx',
        'yaml',
        ...['fift', 'func', 'tlb', 'tolk', 'tasm'].map((name) =>
          JSON.parse(readFileSync(`./public/grammars/${name}.tmLanguage.json`, 'utf8'))
        ),
      ],
      langAlias: {
        'mytonctrl': 'shellscript',
        'tact': 'text',
        'asm': 'tasm',
        'md': 'mdx',
        'tl': 'tlb',
        'env': 'ini',
        'circom': 'cpp',
        'boc': 'text',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
      ],
    },
    remarkPlugins: [remarkMath, remarkMdxMermaid, remarkMdxFiles],
    // NOTE: KaTeX support should be placed before everything else!
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
