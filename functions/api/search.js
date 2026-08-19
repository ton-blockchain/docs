let documentsPromise;
const shardPromises = new Map();

const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase();

const tokenize = (value) => normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [];

const getShardName = (term) => {
  const first = term[0] ?? '';
  if (/^[a-z]$/.test(first)) return first;
  if (/^[0-9]$/.test(first)) return 'digits';
  return 'other';
};

const loadJsonAsset = async (context, path) => {
  const assetUrl = new URL(path, context.request.url);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Search asset request failed with ${response.status}: ${path}`);
  }

  return response.json();
};

const loadDocuments = (context) => {
  if (!documentsPromise) {
    documentsPromise = loadJsonAsset(context, '/search-index/documents').catch((error) => {
      documentsPromise = undefined;
      throw error;
    });
  }

  return documentsPromise;
};

const loadShard = (context, shardName) => {
  if (!shardPromises.has(shardName)) {
    const promise = loadJsonAsset(context, `/search-index/${shardName}`).catch((error) => {
      shardPromises.delete(shardName);
      throw error;
    });
    shardPromises.set(shardName, promise);
  }

  return shardPromises.get(shardName);
};

const getSnippet = (document) => {
  const snippet = document.description ?? document.excerpt;
  if (!snippet) return undefined;
  return snippet.replace(/\s+/g, ' ').trim().slice(0, 240);
};

const searchDocuments = async (context, query) => {
  const terms = [...new Set(tokenize(query))].filter((term) => term.length > 1).slice(0, 8);
  if (terms.length === 0) return [];

  const shardNames = [...new Set(terms.map(getShardName))];
  const [catalog, ...shards] = await Promise.all([
    loadDocuments(context),
    ...shardNames.map((shardName) => loadShard(context, shardName)),
  ]);
  const shardByName = new Map(shardNames.map((shardName, index) => [shardName, shards[index]]));
  const candidates = new Map();

  for (const term of terms) {
    const shard = shardByName.get(getShardName(term));
    if (!shard?.terms) continue;

    for (const [indexedTerm, documentIds] of Object.entries(shard.terms)) {
      if (indexedTerm !== term && !indexedTerm.startsWith(term)) continue;

      for (const documentId of documentIds) {
        const document = catalog.documents[documentId];
        if (!document) continue;

        let candidate = candidates.get(documentId);
        if (!candidate) {
          candidate = { document, matchedTerms: new Set(), score: 0 };
          candidates.set(documentId, candidate);
        }

        if (candidate.matchedTerms.has(term)) continue;
        candidate.matchedTerms.add(term);

        const title = normalize(document.title);
        const description = normalize(document.description ?? '');
        if (title.includes(term)) candidate.score += 120;
        else if (description.includes(term)) candidate.score += 45;
        else candidate.score += indexedTerm === term ? 10 : 5;
      }
    }
  }

  const normalizedQuery = normalize(query).trim();
  const scored = [...candidates.values()];
  for (const candidate of scored) {
    if (candidate.matchedTerms.size === terms.length) candidate.score += 50;
    if (normalize(candidate.document.title).includes(normalizedQuery)) candidate.score += 100;
  }

  scored.sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title));

  return scored.slice(0, 30).flatMap(({ document }) => {
    const snippet = getSnippet(document);
    return [
      {
        id: `${document.id}:page`,
        type: 'page',
        content: document.title,
        url: document.url,
      },
      ...(snippet
        ? [
            {
              id: `${document.id}:text`,
              type: 'text',
              content: snippet,
              url: document.url,
            },
          ]
        : []),
    ];
  });
};

export async function onRequestGet(context) {
  const query = new URL(context.request.url).searchParams.get('query') ?? '';
  if (!query.trim()) return Response.json([]);

  try {
    return Response.json(await searchDocuments(context, query), {
      headers: {
        'cache-control': 'public, max-age=60, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Search request failed', error);
    return Response.json({ error: 'Search is temporarily unavailable' }, { status: 500 });
  }
}
