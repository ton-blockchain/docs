'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  // SearchDialogFooter,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
  type SearchItemType,
  // TagsList,
  // TagsListItem,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
// import { flexsearchStaticClient } from 'fumadocs-core/search/client/flexsearch-static';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { getQuickJumpPages } from '@/lib/source';

export default function DefaultSearchDialog(props: SharedProps) {
  // const [tag] = useState<string | undefined>();
  const { locale } = useI18n(); // (optional) for i18n
  const { search, setSearch, query } = useDocsSearch(
    process.env.NEXT_CONFIG === 'vercel'
      ? {
          type: 'fetch',
          locale,
        }
      : {
          type: 'flexsearch-static',
          // client: flexsearchStaticClient(),
          locale,
          from: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/search`,
          // tag,
        },
  );
  const router = useRouter();
  const pages = getQuickJumpPages();
  const quickJumpAction = useMemo<SearchItemType | undefined>(() => {
    if (search.length === 0) return;

    const normalized = search.toLowerCase();
    for (const page of pages) {
      // NOTE: this could be a fuzzy search instead
      if (!page.title.toLowerCase().startsWith(normalized)) continue;

      return {
        id: 'quick-action',
        type: 'action',
        node: (
          <div className="inline-flex items-center gap-2 text-fd-muted-foreground">
            <ArrowRight className="size-4" />
            <p>
              Jump to <span className="font-medium text-fd-foreground">{page.title}</span>
            </p>
          </div>
        ),
        onSelect: () => router.push(page.url),
      };
    }
  }, [router, search]);

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={
            query.data !== 'empty' || quickJumpAction
              ? [
                  ...(quickJumpAction ? [quickJumpAction] : []),
                  ...(Array.isArray(query.data) ? query.data : []),
                ]
              : null
          }
        />
        {/* <SearchDialogFooter className="flex flex-row">
          <TagsList tag={tag} onTagChange={setTag}>
            <TagsListItem value="my-value">My Value</TagsListItem>
          </TagsList>
        </SearchDialogFooter> */}
      </SearchDialogContent>
    </SearchDialog>
  );
}
