import { source, getSearchablePages } from '@/lib/source';
import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';

const searchSource: typeof source = {
  ...source,
  getPages: getSearchablePages,
};

// https://www.fumadocs.dev/docs/headless/search/flexsearch#static-export
const searchAPI = flexsearchFromSource(searchSource, {
  // async buildIndex(page) {
  //   return {
  //     title: page.data.title,
  //     description: page.data.description,
  //     url: page.url,
  //     id: page.url,
  //     structuredData: await page.data.structuredData(),
  //     breadcrumbs: page.slugs.slice(0, -1),
  //     // tag: undefined,
  //   };
  // }
});

export const revalidate = false;
export const GET = process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
