import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const searchSource: typeof source = {
  ...source,
  getPages: (locale?: string) => source.getPages(locale).filter((p) => !p.data.url && !p.data.noindex),
};
const searchAPI = createFromSource(searchSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
  // buildIndex(page) {
  //   return {
  //     id: page.url,
  //     url: page.url,
  //     title: page.data.title,
  //     description: page.data.description,
  //     structuredData: page.data.structuredData,
  //     tag: page.slugs[0],
  //     // TODO: redirects for /-based folder paths to overview pages.
  //   }
  // },
  sort: {
    enabled: true,
  }
});

export const revalidate = false;
export const GET =
  process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
