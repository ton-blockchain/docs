import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const searchAPI = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const dynamic = 'force-static';

export const GET = searchAPI.staticGET;
