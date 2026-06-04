import { readFileSync } from 'node:fs';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
  remarkMdxFiles,
  remarkGfm,
} from 'fumadocs-core/mdx-plugins';
import { z } from "zod";
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import stringWidth from 'string-width';
import { visitParents } from 'unist-util-visit-parents';

/** See: https://fumadocs.dev/docs/mdx/collections */
export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema.extend({
      // TODO: temporary patch for OpenAPI pages
      title: z.string().optional(),
      sidebarTitle: z.string().optional(),
      url: z.httpUrl().optional(),
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
    remarkPlugins: [
      remarkMath,
      [remarkGfm, {
        singleTilde: false,
        stringLength: stringWidth,
      }],
      remarkMdxMermaid,
      remarkMdxFiles,
    ],
    rehypePlugins: (v) => [
      // NOTE: KaTeX support should be placed before everything else!
      rehypeKatex,
      ...v,
      function rehypeBasePath(): ReturnType<typeof rehypeKatex> {
        return (tree, _file) => {
          const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
          if (base.length === 0 && !base.startsWith('/')) return;
          visitParents(tree, 'element', (node) => {
            try {
              for (const attr of ['src', 'darkSrc', 'href', 'poster']) {
                const value = node.properties?.[attr];
                if (typeof value === 'string' && value.startsWith('/')) {
                  node.properties[attr] = base.replace(/\/*$/, '') + '/' + value.replace(/^\/*/, '');
                }
              }
            } catch (_) {}
          });
        };
      },
    ],
  },
});
