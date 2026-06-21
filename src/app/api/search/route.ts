import { source, getSearchablePages } from '@/lib/source';
import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';

const searchSource: typeof source = {
  ...source,
  getPages: getSearchablePages,
};

// https://www.fumadocs.dev/docs/headless/search/flexsearch#static-export
const searchAPI = flexsearchFromSource(searchSource);

// NOTE: kept previous (Orama) search options for posterity, to be removed later once the search is fine-tuned.
// const searchAPI2 = createFromSource(searchSource, {
//   // https://docs.orama.com/docs/orama-js/supported-languages
//   language: 'english',
//   // buildIndex(page) {
//   //   return {
//   //     id: page.url,
//   //     url: page.url,
//   //     title: page.data.title,
//   //     description: page.data.description,
//   //     structuredData: page.data.structuredData,
//   //     tag: page.slugs[0],
//   //     // TODO: redirects for /-based folder paths to overview pages.
//   //   }
//   // },
//   sort: {
//     enabled: true,
//   },
// });

export const revalidate = false;
export const GET = process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
