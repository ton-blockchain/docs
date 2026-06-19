import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

const tabTitles = [
  'Onboarding',
  'Nodes',
  'Applications',
  'APIs',
  'Smart contracts',
  'TVM',
  'Foundations',
] as const;

function getUrls(title: (typeof tabTitles)[number]): Set<string> | undefined {
  const pages = source.getPages().map((it) => it.path.replace(/^\/*/, '/').replace(/\.mdx$/, ''));
  switch (title) {
    case 'Onboarding':
      return new Set(pages.filter((it) => it.startsWith('/onboarding/') || it === '/start-here'));
    case 'Nodes':
      return new Set(pages.filter((it) => it.startsWith('/nodes/')));
    case 'Applications':
      return new Set(pages.filter((it) => it.startsWith('/applications/')));
    case 'APIs':
      return new Set(pages.filter((it) => it.startsWith('/apis/')));
    case 'Smart contracts':
      return new Set(
        pages.filter(
          (it) =>
            it.startsWith('/standard/') ||
            it.startsWith('/contract-dev/') ||
            it.startsWith('/tolk/'),
        ),
      );
    case 'TVM':
      return new Set(pages.filter((it) => it.startsWith('/tvm/')));
    case 'Foundations':
      return new Set(pages.filter((it) => it.startsWith('/foundations/')));
    default:
      return new Set([]);
  }
}

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
      //     urls: getUrls('Onboarding'),
      //   },
      //   {
      //     title: 'Nodes',
      //     url: '/get-support',
      //     urls: getUrls('Nodes'),
      //   },
      //   {
      //     title: 'Applications',
      //     url: '/from-ethereum',
      //     urls: getUrls('Applications'),
      //   },
      //   {
      //     title: 'APIs',
      //     url: '/more-tutorials',
      //     urls: getUrls('APIs'),
      //   },
      //   {
      //     // union of standard/, contract-dev/, and tolk/
      //     title: 'Smart contracts',
      //     url: '/contract-dev/overview',
      //     urls: getUrls('Smart contracts'),
      //   },
      //   {
      //     title: 'TVM',
      //     url: '/tvm/overview',
      //     urls: getUrls('TVM'),
      //   },
      //   {
      //     title: 'Foundations',
      //     url: '/foundations/config',
      //     urls: getUrls('Foundations'),
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
