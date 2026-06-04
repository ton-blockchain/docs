import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const searchSource: typeof source = {
  ...source,
  getPages: (locale?: string) => source.getPages(locale).filter((p) => !p.data.url),
};
const searchAPI = createFromSource(searchSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const revalidate = false;
export const GET =
  process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
