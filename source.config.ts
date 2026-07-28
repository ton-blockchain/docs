import { readFileSync } from 'node:fs';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
  remarkMdxFiles,
  remarkGfm,
  remarkSteps,
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
import { withBasePath } from './src/lib/shared';

/** See: https://fumadocs.dev/docs/mdx/collections */
export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema
      .extend({
        sidebarTitle: z.string().optional(),
        /** An additional badge next to the page name in the sidebar tree */
        tag: z.string().optional(),
        /** Special pages that are included in the navigation,
            yet redirect immediately to the given external URL */
        url: z.httpUrl().optional(),
        /** Excludes the page from search index, yet not from LLM-generated pages */
        noindex: z.coerce.boolean().default(false),
      })
      .transform((frontmatter) => ({
        ...frontmatter,
        // NOTE: A tag or url must not be used with an openapi specified in the frontmatter
        ...(frontmatter._openapi ? { tag: undefined, url: undefined } : {}),
      })),
    postprocess: {
      includeProcessedMarkdown: true,
    },
    async: true,
  },
  meta: {
    schema: metaSchema.extend({
      tag: z.string().optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    // NOTE: rehypeCode automatically adds an icon based on the language meta string.
    //       yet, we need to add an explicit `icon` override, that would replace itself with
    //       the prefix of an Icon component to the tab/title text, which then will be rendered by mdx
    // remarkCodeTabOptions: {
    //   parseMdx: true,
    // },
    rehypeCodeOptions: {
      themes: {
        light: 'one-light',
        dark: 'dark-plus', // one-dark-pro is an alternative option
      },
      icon: {
        extend: {
          tolk: readFileSync('./public/logo/ton-gray.svg', 'utf8'),
        },
        // NOTE: by default, `lang` is the icon name, and `shortcuts` option allows the `lang` meta name map onto its icon name override.
        // TODO: come up with overrides based on the `icon` meta, might require "swizzling" the CodeBlock component.
        //       the override might place the icon as an MDX inside the title yet disable the default icon attribution.
        //       alternatively, make the override go into the table directly.
      },
      lazy: process.env.NEXT_BUILD_TYPE === 'local' ? true : false,
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
        'powershell',
        'ts',
        'tsx',
        'yaml',
        ...['fift', 'func', 'tlb', 'tolk', 'tasm'].map((name) =>
          JSON.parse(readFileSync(`./src/grammars/${name}.tmLanguage.json`, 'utf8')),
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
        transformerRenderIndentGuides({ indent: 2 }),
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
      //       which should be placed before default plugins!
      function remarkCodeGroup() {
        return (tree) => {
          visitParents(tree, (node: any) => {
            if (node.type !== 'mdxJsxFlowElement' || node.name !== 'CodeGroup') return;
            for (const child of node.children) {
              if (child.type === 'code' && child.meta) {
                child.meta = child.meta.replace(/\btitle=/, 'tab=');
              }
            }
          });
        };
      },
      // NOTE: sourcing `items[]` in Tabs components based on values in child Tab components,
      //       which should be placed before default plugins!
      function remarkTabs() {
        return (tree) => {
          visitParents(tree, (node: any) => {
            if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Tabs') return;
            let vals = [];
            for (const child of node.children) {
              if (child.type !== 'mdxJsxFlowElement' || child.name !== 'Tab') continue;
              const valueAttr = (child.attributes || []).find(
                // @ts-ignore
                (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'value',
              );
              if (!valueAttr || !valueAttr.value) continue;
              vals.push(valueAttr.value);
            }
            if (vals.length === 0) return;
            if (!node.attributes) node.attributes = [];
            const existing = node.attributes.findIndex(
              // @ts-ignore
              (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'items',
            );
            if (existing !== -1) return;
            node.attributes.push({
              type: 'mdxJsxAttribute',
              name: 'items',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: `[${vals.map((v) => JSON.stringify(v)).join(', ')}]`,
                data: {
                  estree: {
                    type: 'Program',
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'ArrayExpression',
                          elements: vals.map((v) => ({
                            type: 'Literal',
                            value: v,
                            raw: JSON.stringify(v),
                          })),
                        },
                      },
                    ],
                    sourceType: 'module',
                  },
                },
              },
            });
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
      remarkSteps,
      function remarkRemoveMdxComments() {
        return (tree: any) => {
          function process(node: any) {
            if (!Array.isArray(node.children)) return;
            node.children = node.children.filter((child: any) => {
              const isExpression =
                child.type === 'mdxFlowExpression' || child.type === 'mdxTextExpression';
              return !(isExpression && /^\s*\/\*[\s\S]*\*\/\s*$/.test(child.value));
            });
            for (const child of node.children) process(child);
          }
          process(tree);
        };
      },
    ],
    rehypePlugins: (v) => [
      // NOTE: KaTeX support should be placed before everything else!
      rehypeKatex,
      ...v,
    ],
  },
  // See: https://github.com/fuma-nama/fumapress/blob/dev/apps/docs/press.config.tsx
  // See: https://github.com/fuma-nama/fumapress/tree/dev/packages/core/src/plugins
  // The following plugins are unavailable in Fumadocs directly
  plugins: [
    // flexsearchPlugin(), // NOTE: consider using it over Orama
    // llmsPlugin(), // NOTE: using it
    // takumiPlugin(), // NOTE: consider using it over Next.js's OG generation iff there's some reason to do so
    // imagePlugin({ formats: ["image/webp", "image/png"] }), // NOTE: optimize images in each PR in its CI
    // linkValidationPlugin(), // NOTE: it is very shallow and we require much more checks
    // sitemapPlugin(), // NOTE: will be added manually
    // mcpPlugin(), // NOTE: llms.txt + skill files are better, because MCP are not always picked up from the context
  ],
});
