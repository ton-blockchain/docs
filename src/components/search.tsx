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
import { create } from '@orama/orama';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import type { Item, Node } from 'fumadocs-core/page-tree';

function initOrama() {
  return create({
    schema: { _: 'string' },
    // https://docs.orama.com/docs/orama-js/supported-languages
    language: 'english',
  });
}

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
          type: 'static',
          initOrama,
          locale,
          from: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/search`,
          // tag,
        },
  );
  const { full } = useTreeContext();
  const router = useRouter();
  const searchMap = useMemo(() => {
    const map = new Map<string, Item>();

    function onNode(node: Node) {
      if (node.type === 'page' && typeof node.name === 'string') {
        map.set(node.name.toLowerCase(), node);
      } else if (node.type === 'folder') {
        if (node.index) onNode(node.index);
        for (const item of node.children) onNode(item);
      }
    }

    for (const item of full.children) onNode(item);
    return map;
  }, [full]);
  const titleJumpAction = useMemo<SearchItemType | undefined>(() => {
    if (search.length === 0) return;

    const normalized = search.toLowerCase();
    for (const [k, page] of searchMap) {
      if (!k.startsWith(normalized)) continue;

      return {
        id: 'quick-action',
        type: 'action',
        node: (
          <div className="inline-flex items-center gap-2 text-fd-muted-foreground">
            <ArrowRight className="size-4" />
            <p>
              Jump to <span className="font-medium text-fd-foreground">{page.name}</span>
            </p>
          </div>
        ),
        onSelect: () => router.push(page.url),
      };
    }
  }, [router, search, searchMap]);

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
            query.data !== 'empty' || titleJumpAction
              ? [
                  ...(titleJumpAction ? [titleJumpAction] : []),
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
