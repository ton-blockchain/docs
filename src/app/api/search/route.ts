import { source, getSearchablePages } from '@/lib/source';
// See: https://www.zbsearch.dev/
import { createFromSource } from 'fumadocs-core/search/server';

const searchSource: typeof source = {
  ...source,
  getPages: getSearchablePages,
};
const searchAPI = createFromSource(searchSource);

export const revalidate = false;
export const GET = process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
