import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';
// import { SidebarSingleOpen } from '@/components/ui/sidebar-so';

const pagePaths = source.getPages().map((it) => it.path.replace(/^\/*/, '/').replace(/\.mdx$/, ''));
const tabUrls: Record<string, Set<string>> = {
  Onboarding: new Set(
    pagePaths.filter(
      (it) =>
        it.startsWith('/onboarding/') ||
        ['/start-here', '/get-support', '/from-ethereum', '/tps'].includes(it),
    ),
  ),
  Nodes: new Set(pagePaths.filter((it) => it.startsWith('/nodes/'))),
  Applications: new Set(pagePaths.filter((it) => it.startsWith('/applications/'))),
  APIs: new Set(pagePaths.filter((it) => it.startsWith('/api/'))),
  Contracts: new Set(pagePaths.filter((it) => it.startsWith('/contracts/'))),
  Tolk: new Set(pagePaths.filter((it) => it.startsWith('/tolk/'))),
  TVM: new Set(pagePaths.filter((it) => it.startsWith('/tvm/'))),
  Foundations: new Set(pagePaths.filter((it) => it.startsWith('/foundations/'))),
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{ title: <ThemeLogo /> }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      tree={source.getPageTree()}
      sidebar={{ collapsible: true }}
      tabs={[
        {
          title: 'Onboarding',
          url: '/start-here',
          urls: tabUrls.Onboarding,
        },
        {
          title: 'Nodes',
          url: '/nodes/overview',
          urls: tabUrls.Nodes,
        },
        {
          title: 'Applications',
          url: '/applications/overview',
          urls: tabUrls.Applications,
        },
        {
          title: 'APIs',
          url: '/api/overview',
          urls: tabUrls.APIs,
        },
        {
          title: 'Smart contracts',
          url: '/contracts/overview',
          urls: tabUrls.Contracts,
        },
        {
          title: (
            <>
              <span className="style-tab-normal">Tolk</span>
              <span className="style-tab-wide">Tolk language</span>
            </>
          ),
          url: '/tolk/overview',
          urls: tabUrls.Tolk,
        },
        {
          title: (
            <>
              <span className="style-tab-normal">TVM</span>
              <span className="style-tab-wide">TON Virtual Machine</span>
            </>
          ),
          url: '/tvm/overview',
          urls: tabUrls.TVM,
        },
        {
          title: (
            <>
              <span className="style-tab-normal">Foundations</span>
              <span className="style-tab-wide">Blockchain foundations</span>
            </>
          ),
          url: '/foundations/overview',
          urls: tabUrls.Foundations,
        },
      ]}
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
      {/* <SidebarSingleOpen /> */}
      {children}
    </DocsLayout>
  );
}
