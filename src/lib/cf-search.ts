import { createContentHighlighter, type SortedResult } from 'fumadocs-core/search';
import type { SearchClient } from 'fumadocs-core/search/client';
import { getByID, loadAsync, search, type RawData } from 'zbsearch';
import { cfSearchFormat, createCfSearchDB } from './cf-search-schema.mjs';

interface Options {
  from?: string;
}

interface SearchDocument {
  id: string | number;
  type: 'page' | 'heading' | 'text';
  content: string;
  breadcrumbs?: string[];
  url: string;
}

interface SearchHit {
  document: SearchDocument;
}

interface LoadedSearch {
  database: ReturnType<typeof createCfSearchDB>;
  pageIds: string[];
}

const cache = new Map<string, Promise<LoadedSearch>>();

async function loadSearch(from: string): Promise<LoadedSearch> {
  const response = await fetch(from);
  if (!response.ok) {
    throw new Error(`Failed to load search index from ${from}: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('type' in data) ||
    data.type !== 'advanced' ||
    !('format' in data) ||
    data.format !== cfSearchFormat ||
    !('pageIds' in data) ||
    !Array.isArray(data.pageIds) ||
    !data.pageIds.every((pageId) => typeof pageId === 'string')
  ) {
    throw new Error(`Unsupported search index format from ${from}`);
  }

  const database = createCfSearchDB();
  await loadAsync(database, data as unknown as RawData);
  return { database, pageIds: data.pageIds };
}

function getSearch(from: string) {
  const cached = cache.get(from);
  if (cached) return cached;

  const loading = loadSearch(from).catch((error: unknown) => {
    if (cache.get(from) === loading) cache.delete(from);
    throw error;
  });
  cache.set(from, loading);
  return loading;
}

export function cfStaticClient({ from = '/api/search' }: Options = {}): SearchClient {
  return {
    deps: [from],
    async search(query) {
      const { database, pageIds } = await getSearch(from);
      const result = await search(database, {
        ...(query.length > 0 ? { term: query } : {}),
        limit: 60,
        properties: ['content'],
        groupBy: {
          properties: ['page_group'],
          maxResult: 8,
        },
      });
      const highlighter = createContentHighlighter(query);
      const output: SortedResult[] = [];

      for (const group of result.groups ?? []) {
        const pageGroup = group.values[0];
        if (typeof pageGroup !== 'number') continue;

        const pageId = pageIds[pageGroup];
        if (pageId === undefined) continue;

        const page = getByID(database, pageId) as SearchDocument | undefined;
        if (!page) continue;

        output.push({
          id: pageId,
          type: 'page',
          content: highlighter.highlightMarkdown(page.content),
          breadcrumbs: page.breadcrumbs,
          url: page.url,
        });

        for (const hit of group.result as unknown as SearchHit[]) {
          const document = hit.document;
          if (document.type === 'page') continue;
          output.push({
            id: document.id.toString(),
            type: document.type,
            content: highlighter.highlightMarkdown(document.content),
            breadcrumbs: document.breadcrumbs,
            url: document.url,
          });
        }
      }

      return output.slice(0, 60);
    },
  };
}
