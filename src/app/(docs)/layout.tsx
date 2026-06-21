import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

const pagePaths = source.getPages().map((it) => it.path.replace(/^\/*/, '/').replace(/\.mdx$/, ''));
const tabUrls: Record<string, Set<string>> = {
  Onboarding: new Set(
    pagePaths.filter((it) => it.startsWith('/onboarding/') || it === '/start-here'),
  ),
  Nodes: new Set(pagePaths.filter((it) => it.startsWith('/nodes/'))),
  Applications: new Set(pagePaths.filter((it) => it.startsWith('/applications/'))),
  APIs: new Set(pagePaths.filter((it) => it.startsWith('/apis/'))),
  Contracts: new Set(
    pagePaths.filter(
      (it) =>
        it.startsWith('/standard/') || it.startsWith('/contract-dev/') || it.startsWith('/tolk/'),
    ),
  ),
  TVM: new Set(pagePaths.filter((it) => it.startsWith('/tvm/'))),
  Foundations: new Set(pagePaths.filter((it) => it.startsWith('/foundations/'))),
};

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
      //       with `root: true` items in meta.json files after restructuring.
      //       (alternatively): will be populated manually in the following manner:
      // tabs={[
      //   {
      //     title: 'Onboarding',
      //     url: '/start-here',
      //     urls: tabUrls.Onboarding,
      //   },
      //   {
      //     title: 'Nodes',
      //     url: '/get-support',
      //     urls: tabUrls.Nodes,
      //   },
      //   {
      //     title: 'Applications',
      //     url: '/from-ethereum',
      //     urls: tabUrls.Applications,
      //   },
      //   {
      //     title: 'APIs',
      //     url: '/more-tutorials',
      //     urls: tabUrls.APIs,
      //   },
      //   {
      //     // union of standard/, contract-dev/, and tolk/
      //     title: 'Smart contracts',
      //     url: '/contract-dev/overview',
      //     urls: tabUrls.Contracts,
      //   },
      //   {
      //     title: 'TVM',
      //     url: '/tvm/overview',
      //     urls: tabUrls.TVM,
      //   },
      //   {
      //     title: 'Foundations',
      //     url: '/foundations/config',
      //     urls: tabUrls.Foundations,
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
            `"sidebar . tabs toc toc"`,
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
