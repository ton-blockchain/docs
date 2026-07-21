import Link from 'next/link';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <DocsLayout
      nav={{ title: <ThemeLogo /> }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      tree={source.getPageTree()}
      sidebar={{ collapsible: false }}
      // NOTE: pass the same tabs as (docs)/layout.tsx
      // NOTE: use common/shared options, see other fumadocs repos.
      // NOTE: consider mirroring the docs page layout, and making the links be something like cards (or just use literal cards).
      tabMode="top"
      // NOTE: Must mirror (docs)/layout.tsx
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
      <div className="flex flex-col items-center justify-center text-center gap-4 p-8 [grid-area:main]">
        <p className="text-sm font-medium text-fd-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="max-w-md text-fd-muted-foreground">
          The page you are looking for does not exist :(
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Home page
          </Link>
          <Link
            href="/get-support"
            className="rounded-md border border-fd-border px-4 py-2 text-sm font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            Get support
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
