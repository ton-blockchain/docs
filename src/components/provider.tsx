'use client';
import SearchDialog, { type QuickJumpPage } from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import { type ReactNode, useCallback } from 'react';

export function Provider({
  children,
  quickJumpPages,
}: {
  children: ReactNode;
  quickJumpPages: QuickJumpPage[];
}) {
  const ConfiguredSearchDialog = useCallback(
    (props: SharedProps) => <SearchDialog {...props} quickJumpPages={quickJumpPages} />,
    [quickJumpPages],
  );

  return <RootProvider search={{ SearchDialog: ConfiguredSearchDialog }}>{children}</RootProvider>;
}
