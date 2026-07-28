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
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { flexsearchStaticClient } from 'fumadocs-core/search/client/flexsearch-static';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

export interface QuickJumpPage {
  title: string;
  normalizedTitle: string;
  url: string;
}

export default function DefaultSearchDialog({
  quickJumpPages,
  ...props
}: SharedProps & { quickJumpPages: QuickJumpPage[] }) {
  // const [tag] = useState<string | undefined>();
  const { locale } = useI18n(); // (optional) for i18n
  const client =
    process.env.NEXT_CONFIG === 'vercel'
      ? fetchClient({ locale })
      : flexsearchStaticClient({
          locale,
          from: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/search`,
          // tag,
        });
  const { search, setSearch, query } = useDocsSearch({ client });
  const router = useRouter();
  const quickJumpAction = useMemo<SearchItemType | undefined>(() => {
    if (search.length === 0) return;

    const normalized = search.toLowerCase();
    for (const page of quickJumpPages) {
      if (!page.normalizedTitle.includes(normalized)) continue;

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
        onSelect: () => router.push(page.url),
      };
    }
  }, [quickJumpPages, router, search]);

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
