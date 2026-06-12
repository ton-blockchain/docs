import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{ title: <ThemeLogo /> }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      tree={source.getPageTree()}
      sidebar={{
        collapsible: false,
      }}
      // TODO: was used for experiments, would be automatically populated
      //       with `root: true` items in meta.json files after restructuring
      // tabs={[
      //   {
      //     title: 'aaaa',
      //     url: '/start-here',
      //   },
      //   {
      //     title: 'aaaa2',
      //     url: '/payments/overview',
      //   },
      // ]}
      tabMode="top"
      // Fumadocs works with a named-area CSS grid: each layout part self-places via its own `grid-area`.
      // This re-remplate brings the sidebar to the left and adds a tab row/band for `tabMode='top'`.
      //
      // Widths and heights are driven by Fumadocs-owned vars:
      // • --fd-sidebar-col (→0 when collapsed)
      // • --fd-sidebar-width
      // • --fd-toc-width
      // • --fd-layout-width (content cap).
      //
      // Added a var for the tab row height: --fd-tabs-height.
      // See the src/app/global.css for the additional style modifications to the tabs.
      //
      containerProps={{
        style: {
          gridTemplate: [
            `"sidebar . header toc toc"`,
            `"sidebar . tabs toc toc" var(--fd-tabs-height,3rem)`,
            `"sidebar . toc-popover toc toc"`,
            `"sidebar . main toc toc"`,
            `1fr / var(--fd-sidebar-col) minmax(min-content, 1fr) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          ].join(' '),
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
