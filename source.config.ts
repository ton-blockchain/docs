import { readFileSync } from 'node:fs';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
  remarkMdxFiles,
  remarkGfm,
} from 'fumadocs-core/mdx-plugins';
import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import { z } from 'zod';
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
  transformerRenderIndentGuides,
} from '@shikijs/transformers';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import stringWidth from 'string-width';
import { visitParents } from 'unist-util-visit-parents';

/** See: https://fumadocs.dev/docs/mdx/collections */
export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema
      .extend({
        sidebarTitle: z.string().optional(),
        tag: z.string().optional(),
        url: z.httpUrl().optional(),
        noindex: z.coerce.boolean().default(false),
      })
      .transform((frontmatter) => ({
        ...frontmatter,
        // NOTE: A tag must not be used with an openapi specified in the frontmatter
        ...(frontmatter._openapi ? { tag: undefined } : {}),
      })),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema.extend({
      tag: z.string().optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        // NOTE: one-light and one-dark-pro are alternative options
        light: 'github-light-default',
        dark: 'dark-plus',
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
          JSON.parse(
            readFileSync(`./public/grammars/${name}.tmLanguage.json`, 'utf8'),
          ),
        ),
      ],
      langAlias: {
        mytonctrl: 'shellscript',
        tact: 'text',
        asm: 'tasm',
        md: 'mdx',
        tl: 'tlb',
        env: 'ini',
        circom: 'cpp',
        boc: 'text',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerRenderIndentGuides(),
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
        transformerNotationHighlight({ matchAlgorithm: 'v3' }),
        transformerNotationWordHighlight({ matchAlgorithm: 'v3' }),
        transformerNotationDiff({ matchAlgorithm: 'v3' }),
        transformerNotationFocus({ matchAlgorithm: 'v3' }),
        {
          name: 'Disable copying with a noCopy attribute',
          pre(pre) {
            const raw = this.options?.meta?.__raw;
            if (!raw) return pre;
            const { attributes } = parseCodeBlockAttributes(raw, ['noCopy']);
            if ('noCopy' in attributes) {
              pre.properties.allowCopy = '';
            }
            return pre;
          },
        },
      ],
    },
    remarkPlugins: (v) => [
      // NOTE: `title=` → `tab=` meta pre-processing in CodeGroup components,
      //       which should be placed before everything else!
      function remarkCodeGroup() {
        return (tree) => {
          visitParents(tree, (node: any) => {
            if (node.type !== 'mdxJsxFlowElement' || node.name !== 'CodeGroup')
              return;
            for (const child of node.children) {
              if (child.type === 'code' && child.meta) {
                child.meta = child.meta.replace(/\btitle=/, 'tab=');
              }
            }
          });
        };
      },
      // Default Fumadocs remark plugins
      ...v,
      // Additional plugins
      remarkMath,
      [
        remarkGfm,
        {
          singleTilde: false,
          stringLength: stringWidth,
        },
      ],
      remarkMdxMermaid,
      remarkMdxFiles,
    ],
    rehypePlugins: (v) => [
      // NOTE: KaTeX support should be placed before everything else!
      rehypeKatex,
      ...v,
    ],
  },
});
