import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  pageTree: {
    transformers: [
      {
        file(node, filePath) {
          if (!filePath) return node
          const file = this.storage.read(filePath)
          if (!file) return node
          // if (file.data.icon) node.icon = file.data.icon
          if (file.format !== "page") return node
          const {sidebarTitle} = file.data as {sidebarTitle?: string}
          if (!sidebarTitle) return node
          node.name = sidebarTitle
          return node
        },
        // folder(node, _folderPath, metaPath) {
        //   if (!metaPath) return node
        //   const file = this.storage.read(metaPath)
        //   if (!file) return node
        //   if (file.data.icon) node.icon = file.data.icon
        //   return node
        // },
      },
    ],
  },
  plugins: [],
});

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

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
