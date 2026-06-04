import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const searchAPI = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const revalidate = false;

export const GET =
  process.env.NEXT_CONFIG === 'vercel' ? searchAPI.GET : searchAPI.staticGET;
