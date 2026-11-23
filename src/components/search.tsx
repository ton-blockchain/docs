'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  History as HistoryIcon,
  Star,
  X,
  // ArrowDown,
  // ArrowUp,
  // CornerDownLeft,
} from 'lucide-react';
import { pluginPT15 } from '@zbsearch/plugin-pt15';
import { create } from 'zbsearch';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  // SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
  type SharedProps,
  type SearchItemType,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { cfStaticClient } from '@/lib/cf-search';

export interface QuickJumpPage {
  title: string;
  normalizedTitle: string;
  url: string;
}

type SavedItem = { url: string; title: string };
type History = { favorites: SavedItem[]; recent: SavedItem[]; memoryOnly: boolean };
type SavedSearchItem = Extract<SearchItemType, { type: 'action' }> & {
  saved: SavedItem;
  favorite: boolean;
  first: boolean;
};

// NOTE(novusnota): Might be better to put /start-here here, still not sure.
const startingPage = { url: '/', title: 'TON Docs — developer documentation' };
const storageKey = 'ton-docs-search';
const maxFavorites = 10;
const maxRecents = 5;
const emptyHistory: History = { favorites: [], recent: [], memoryOnly: false };
const listeners = new Set<() => void>();
const storageWritable = canWriteStorage();
let memory: History | undefined;
let lastStoredValue: string | null | undefined;

export default function DefaultSearchDialog({
  quickJumpPages,
  ...props
}: SharedProps & { quickJumpPages: QuickJumpPage[] }) {
  const from = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/search`;
  const client = useMemo(
    () =>
      process.env.NEXT_CONFIG === 'vercel'
        ? fetchClient()
        : process.env.NEXT_BUILD_TYPE === 'cloudflare'
          ? cfStaticClient({ from })
          : staticClient({
              from,
              initDB: () => create({ schema: { _: 'string' }, plugins: [pluginPT15()] }),
            }),
    [from],
  );
  const { search, setSearch, query } = useDocsSearch({ client });
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useSyncExternalStore(subscribeHistory, readHistory, getServerHistory);
  const pagesByUrl = useMemo(
    () => new Map(quickJumpPages.map((page) => [page.url, page])),
    [quickJumpPages],
  );

  const quickJumpAction = useMemo<SearchItemType | undefined>(() => {
    if (search.length === 0) return;
    const normalized = search.toLowerCase();
    const page = quickJumpPages.find((entry) => entry.normalizedTitle.includes(normalized));
    if (!page) return;
    return {
      id: 'quick-action',
      type: 'action',
      node: (
        <div className="inline-flex items-center gap-2 text-fd-muted-foreground">
          <ArrowRight className="size-4" />
          <p className="pt-0.5">
            Jump to <span className="font-medium text-fd-foreground">{page.title}</span>
          </p>
        </div>
      ),
      onSelect: () => {
        remember({ url: page.url, title: page.title });
        router.push(page.url);
      },
    };
  }, [quickJumpPages, router, search]);

  const favoritesCount = history.favorites.length;
  const savedItems = useMemo<SavedSearchItem[]>(() => {
    return [...history.favorites, ...history.recent].map((saved, index) => ({
      id: saved.url,
      type: 'action',
      node: null,
      saved,
      favorite: index < favoritesCount,
      first: index === 0 || index === favoritesCount,
      onSelect: () => {
        remember(saved);
        router.push(saved.url);
      },
    }));
  }, [favoritesCount, history, router]);
  const searchItems = useMemo(
    () =>
      query.data !== 'empty' || quickJumpAction
        ? [
            ...(quickJumpAction ? [quickJumpAction] : []),
            ...(Array.isArray(query.data) ? query.data : []),
          ]
        : null,
    [query.data, quickJumpAction],
  );
  const hasNoItems = search.length === 0 && savedItems.length === 0;
  const items = hasNoItems ? null : search.length === 0 ? savedItems : searchItems;

  return (
    <SearchDialog
      {...props}
      onOpenChange={(open) => {
        if (!open) setSearch('');
        props.onOpenChange(open);
      }}
      search={search}
      onSearchChange={setSearch}
      isLoading={search.length > 0 && query.isLoading}
      onSelect={(item) => {
        if (item.type === 'action') return;
        const page = pagesByUrl.get(pageUrl(item.url));
        if (page) remember({ url: item.url, title: page.title });
      }}
    >
      <SearchDialogOverlay />
      <SearchDialogContent
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement)
          ) {
            event.stopPropagation();
          } else if (
            search.length === 0 &&
            (event.key === 'ArrowDown' || event.key === 'ArrowUp')
          ) {
            const content = event.currentTarget;
            requestAnimationFrame(() =>
              content.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }),
            );
          }
        }}
      >
        <SearchDialogHeader className={hasNoItems ? 'border-b-0!' : undefined}>
          <SearchDialogIcon />
          <SearchDialogInput ref={inputRef} />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          className={hasNoItems ? 'border-b-0!' : undefined}
          items={items}
          Empty={() => (
            <div className="py-12 text-center text-sm text-fd-muted-foreground">
              No results found. Try the{' '}
              <Link
                href={startingPage.url}
                className="text-fd-primary"
                onClick={() => remember(startingPage)}
                onAuxClick={(event) => {
                  if (event.button === 1) remember(startingPage);
                }}
                onNavigate={() => {
                  setSearch('');
                  props.onOpenChange(false);
                }}
              >
                landing page
              </Link>
              .
            </div>
          )}
          Item={({ item, onClick }) => {
            if (search.length > 0) {
              return (
                <SearchDialogListItem item={item} onClick={onClick} className="cursor-pointer" />
              );
            }
            if (savedItems.length === 0) {
              return undefined;
            }
            const { saved, favorite, first } = item as SavedSearchItem;
            return (
              <div>
                {first && (
                  <div className="flex items-center gap-2 px-3 pt-3 pb-3 text-xs font-medium text-fd-muted-foreground">
                    <span className="inline-flex pb-px">
                      {favorite ? (
                        <Star aria-hidden="true" className="size-3.5" />
                      ) : (
                        <HistoryIcon aria-hidden="true" className="size-3.5" />
                      )}
                    </span>
                    <span className="leading-none">{favorite ? 'Favorites' : 'Recents'}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <SearchDialogListItem
                    item={item}
                    onClick={onClick}
                    className="min-w-0 flex-1 cursor-pointer rounded-none bg-transparent aria-selected:text-fd-primary hover:text-fd-primary focus-visible:text-fd-primary focus-visible:outline-none"
                  >
                    <span className="block truncate font-medium">{saved.title}</span>
                  </SearchDialogListItem>
                  {!history.memoryOnly && (favorite || favoritesCount < maxFavorites) && (
                    <button
                      type="button"
                      aria-label={`Favorite ${saved.title}`}
                      aria-pressed={favorite}
                      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={() => {
                        toggleFavorite(saved, favorite);
                        inputRef.current?.focus();
                      }}
                      className="rounded-md p-2 text-fd-muted-foreground hover:bg-fd-accent focus-visible:outline-2 focus-visible:outline-fd-ring"
                    >
                      <Star className={favorite ? 'size-4 fill-current' : 'size-4'} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${saved.title} from saved results`}
                    title="Remove from recents"
                    onClick={() => {
                      removeSaved(saved);
                      inputRef.current?.focus();
                    }}
                    className="rounded-md p-2 text-fd-muted-foreground hover:bg-fd-accent focus-visible:outline-2 focus-visible:outline-fd-ring"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            );
          }}
        />
        {/* <SearchDialogFooter className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-fd-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" /> Navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" /> Open
          </span>
        </SearchDialogFooter> */}
      </SearchDialogContent>
    </SearchDialog>
  );
}

function canWriteStorage(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = `${storageKey}:probe:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, '');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function isSavedItem(value: unknown): value is SavedItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.url === 'string' &&
    /^\/(?![\/\\])[^\\\u0000-\u001f]*$/.test(item.url) &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0
  );
}

function pageUrl(url: string): string {
  return url.split('#')[0];
}

function readHistory(): History {
  if (memory?.memoryOnly) return memory;
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return (memory = { favorites: [], recent: memory?.recent ?? [], memoryOnly: true });
  }
  if (memory && raw === lastStoredValue) return memory;
  lastStoredValue = raw;
  try {
    const stored: unknown = JSON.parse(raw ?? 'null');
    if (typeof stored !== 'object' || stored === null) {
      return (memory = { ...emptyHistory, memoryOnly: !storageWritable });
    }
    const data = stored as Record<string, unknown>;
    const seen = new Set<string>();
    const collect = (items: unknown, limit = Infinity): SavedItem[] => {
      if (!Array.isArray(items)) return [];
      const saved: SavedItem[] = [];
      for (const item of items) {
        if (!isSavedItem(item)) continue;
        const page = pageUrl(item.url);
        if (seen.has(page)) continue;
        seen.add(page);
        saved.push({ url: item.url, title: item.title });
        if (saved.length === limit) break;
      }
      return saved;
    };
    const favorites = storageWritable ? collect(data.favorites, maxFavorites) : [];
    return (memory = {
      favorites,
      recent: collect(data.recent, maxRecents),
      memoryOnly: !storageWritable,
    });
  } catch {
    return (memory = { ...emptyHistory, memoryOnly: !storageWritable });
  }
}

function onHistoryStorage(event: StorageEvent) {
  if (!memory?.memoryOnly && (event.key === storageKey || event.key === null)) {
    listeners.forEach((listener) => listener());
  }
}

function subscribeHistory(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onHistoryStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onHistoryStorage);
  };
}

function getServerHistory() {
  return emptyHistory;
}

function updateHistory(update: (current: History) => History) {
  const previous = memory;
  const current = readHistory();
  const next = update(current);
  if (next === current) {
    if (previous !== current) listeners.forEach((listener) => listener());
    return;
  }
  memory = next;
  if (!current.memoryOnly) {
    try {
      const value = JSON.stringify({ favorites: next.favorites, recent: next.recent });
      localStorage.setItem(storageKey, value);
      lastStoredValue = value;
    } catch {
      // Keep the recent item if moving it to favorites failed.
      memory = {
        favorites: [],
        recent: next.favorites.length > current.favorites.length ? current.recent : next.recent,
        memoryOnly: true,
      };
    }
  }
  listeners.forEach((listener) => listener());
}

function remember(item: SavedItem) {
  if (!isSavedItem(item)) return;
  const page = pageUrl(item.url);
  updateHistory((current) => {
    if (current.favorites.some((favorite) => pageUrl(favorite.url) === page)) {
      return current;
    }
    const first = current.recent[0];
    if (first?.url === item.url && first.title === item.title) {
      return current;
    }
    return {
      ...current,
      recent: [item, ...current.recent.filter((recent) => pageUrl(recent.url) !== page)].slice(
        0,
        maxRecents,
      ),
    };
  });
}

function toggleFavorite(saved: SavedItem, favorite: boolean) {
  const page = pageUrl(saved.url);
  updateHistory((current) => {
    if (current.memoryOnly || (!favorite && current.favorites.length >= maxFavorites))
      return current;
    const source = favorite ? current.favorites : current.recent;
    const index = source.findIndex((entry) => pageUrl(entry.url) === page);
    if (index === -1) return current;
    const remaining = source.slice();
    const [item] = remaining.splice(index, 1);
    return favorite
      ? { ...current, favorites: remaining, recent: [item, ...current.recent].slice(0, maxRecents) }
      : { ...current, favorites: [...current.favorites, item], recent: remaining };
  });
}

function removeSaved(saved: SavedItem) {
  const page = pageUrl(saved.url);
  updateHistory((current) => {
    const favoriteIndex = current.favorites.findIndex((entry) => pageUrl(entry.url) === page);
    if (favoriteIndex !== -1) {
      const favorites = current.favorites.slice();
      favorites.splice(favoriteIndex, 1);
      return { ...current, favorites };
    }
    const recentIndex = current.recent.findIndex((entry) => pageUrl(entry.url) === page);
    if (recentIndex === -1) return current;
    const recent = current.recent.slice();
    recent.splice(recentIndex, 1);
    return { ...current, recent };
  });
}
