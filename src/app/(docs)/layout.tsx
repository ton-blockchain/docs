import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
// import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{
        // JSX supported
        title: <ThemeLogo />,
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      tree={source.getPageTree()}
      sidebar={{
        collapsible: false,
      }}
      containerProps={{
        style: {
          gridTemplate: `"sidebar . header toc toc"
"sidebar . toc-popover toc toc"
"sidebar . main toc toc" 1fr / var(--fd-sidebar-col) minmax(min-content, 1fr) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
        }
      }}
    >
      {children}
    </DocsLayout>
  );
}
