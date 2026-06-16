import { createElement, Fragment, type ComponentType, type SVGProps } from 'react';
import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { icons } from 'lucide-react';
import { docsContentRoute, docsImageRoute, docsRoute, toPascalCase, withBasePath } from './shared';

// NOTE: Consider using the following as a plugin instead:
//       import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
function resolveLucideIcon(name: string | undefined) {
  if (!name) return undefined;
  const Comp = (icons as Record<string, ComponentType<SVGProps<SVGSVGElement>>>)[
    toPascalCase(name)
  ];
  if (!Comp) return undefined;
  return createElement(Comp);
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  icon: resolveLucideIcon,
  pageTree: {
    transformers: [
      {
        file(node, filePath) {
          if (!filePath) return node;
          const file = this.storage.read(filePath);
          if (!file) return node;
          // if (file.data.icon) node.icon = file.data.icon
          if (file.format !== 'page') return node;
          // Use the sidebar-only title if it exists
          if (file.data.sidebarTitle) {
            node.name = file.data.sidebarTitle;
          }
          // Wrap file name in <code> for function or component reference pages
          if (
            typeof node.name === 'string' &&
            (node.name.endsWith('()') || node.name.match(/^<\w+ \/>$/))
          ) {
            node.name = createElement(
              'code',
              { key: '0', className: 'text-[0.8125rem]' },
              node.name,
            );
          }
          // Apply the tag from the page frontmatter if the openapi field is unset
          if (file.data.tag && !file.data._openapi) {
            node.name = createElement(
              Fragment,
              null,
              node.name,
              ' ',
              createElement(
                'span',
                {
                  className:
                    'ms-auto border border-current px-1 rounded-lg text-xs text-nowrap whitespace-nowrap',
                },
                file.data.tag,
              ),
            );
          }
          // Apply the white-space: nowrap for the <span> with the OpenAPI tag that follows the text
          if (file.data._openapi) {
            node.name = createElement(
              'span',
              { className: 'style-subsequent-openapi-tag' },
              node.name,
            );
          }
          return node;
        },
        folder(node, _folderPath, metaPath) {
          if (!metaPath) return node;
          const file = this.storage.read(metaPath);
          if (!file) return node;
          if (file.format !== 'meta') return node;
          // Apply the tag from the page frontmatter
          if (file.data.tag) {
            node.name = createElement(
              Fragment,
              null,
              node.name,
              ' ',
              createElement(
                'span',
                {
                  className:
                    'ms-auto border border-current px-1 rounded-lg text-xs text-nowrap whitespace-nowrap',
                },
                file.data.tag,
              ),
            );
          }
          return node;
        },
      },
    ],
  },
  plugins: [openapiPlugin()],
});

export type Page = (typeof source)['$inferPage'];
export type Meta = (typeof source)['$inferMeta'];

export function getIndexablePages(locale?: string) {
  return source.getPages(locale).filter((page) => !page.data.url);
}

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

function prefixProcessedMarkdownLinks(md: string): string {
  return (
    md
      // ](/…) inline + ![](/…)
      .replace(/(\]\()(\/[^)\s]*)/g, (_m, p, url) => p + withBasePath(url))
      // []: /… reference defs
      .replace(/(\]:\s+)(\/\S*)/g, (_m, p, url) => p + withBasePath(url))
  );
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = prefixProcessedMarkdownLinks(await page.data.getText('processed'));

  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
