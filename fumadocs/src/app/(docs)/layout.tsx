import type { ReactNode } from 'react';
// import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { source } from '@/lib/source';
import { appName, gitConfig } from '@/lib/shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{
        // JSX supported
        title: appName,
        mode: 'top'
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      tree={source.getPageTree()}
      sidebar={{
        collapsible: false,
      }}
      tabMode="navbar"
    >
      {children}
    </DocsLayout>
  );
}
