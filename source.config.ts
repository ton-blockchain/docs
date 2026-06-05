import { readFileSync } from 'node:fs';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
  remarkMdxFiles,
  remarkGfm,
} from 'fumadocs-core/mdx-plugins';
import { parseCodeBlockAttributes } from "fumadocs-core/mdx-plugins/codeblock-utils"
import { z } from "zod";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
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
    // TODO: consider extending with a `tag`.
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
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
        transformerNotationHighlight({ matchAlgorithm: "v3" }),
        transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
        transformerNotationFocus({ matchAlgorithm: "v3" }),
        {
          name: "no-copy",
          pre(pre) {
            const raw = this.options?.meta?.__raw
            if (!raw) return pre
            const { attributes } = parseCodeBlockAttributes(raw, ["noCopy"])
            if ("noCopy" in attributes) {
              pre.properties.allowCopy = ""
            }
            return pre
          },
        }
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
          if (base.length === 0) return
          if (!base.startsWith('/')) return;
          const prefix = base.replace(/\/*$/, '') + '/';
          const urlAttrs = ['src', 'darkSrc', 'href', 'poster'];
          const rewrite = (value: unknown) =>
            typeof value === 'string' && value.startsWith('/') && !value.startsWith(prefix)
              ? prefix + value.replace(/^\/*/, '')
              : value;
          // Visit all nodes to rewrite all non-/docs prefixed root-relative media links properly.
          visitParents(tree, (node: any) => {
            if (node.type === 'element' && node.properties) {
              for (const attr of urlAttrs) {
                if (typeof node.properties?.[attr] === 'string') {
                  node.properties[attr] = rewrite(node.properties[attr]);
                }
              }
            } else if (
              (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
              Array.isArray(node.attributes)
            ) {
              for (const attr of node.attributes) {
                if (attr.type === 'mdxJsxAttribute' && urlAttrs.includes(attr.name)) {
                  attr.value = rewrite(attr.value);
                }
              }
            }
          });
        };
      },
    ],
  },
});
