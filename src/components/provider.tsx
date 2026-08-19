'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import type { ReactNode } from 'react';
import DefaultSearchDialog, { type QuickJumpPage } from '@/components/search';

export function Provider({
  children,
  quickJumpPages,
}: {
  children: ReactNode;
  quickJumpPages: QuickJumpPage[];
}) {
  if (process.env.NEXT_BUILD_TYPE === 'cloudflare') {
    return (
      <RootProvider
        search={{
          SearchDialog: (props: SharedProps) => (
            <DefaultSearchDialog {...props} quickJumpPages={quickJumpPages} />
          ),
        }}
      >
        {children}
      </RootProvider>
    );
  }

  return <RootProvider search={{ enabled: false }}>{children}</RootProvider>;
}
