import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  // MarkdownCopyButton,
  // ViewOptionsPopover,
  // } from 'fumadocs-ui/layouts/notebook/page';
} from 'fumadocs-ui/layouts/docs/page';
import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import { gitConfig } from '@/lib/shared';
import { getMDXComponents } from '@/components/mdx';
import { LLMCopyButton, ViewOptions } from '@/components/mdx/page-actions';
import { ScrollTop } from '@/components/ui/scroll-top';

const localSkippedPagePaths = new Set([
  'foundations/whitepapers/catchain.mdx',
  'foundations/whitepapers/tblkch.mdx',
  'foundations/whitepapers/ton.mdx',
  'foundations/whitepapers/tvm.mdx',
  'languages/fift/whitepaper.mdx',
  'tvm/instructions.mdx',
]);

function shouldSkipLocalPage(path: string) {
  return process.env.NEXT_BUILD_TYPE === 'local' && localSkippedPagePaths.has(path);
}

export default async function Page(props: PageProps<'/[...slug]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();
  if (page.data.url) {
    // TODO: consider using `redirect()` from next/navigation
    return (
      <>
        <meta httpEquiv="refresh" content={`0; url=${page.data.url}`} />
        <meta name="robots" content="noindex, follow" />
        <DocsPage toc={[]}>
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsBody>
            <p>
              Redirecting to <a href={page.data.url}>{page.data.url}</a>…
            </p>
          </DocsBody>
        </DocsPage>
      </>
    );
  }

  if (shouldSkipLocalPage(page.path)) {
    return (
      <DocsPage toc={[]} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
        <DocsBody>
          <p>
            This large reference page is skipped in local builds to avoid compiling an oversized MDX
            module.
          </p>
        </DocsBody>
      </DocsPage>
    );
  }

  const { body: MDX, toc } = await page.data.load();
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      toc={toc}
      full={page.data.full || toc.length === 0}
      tableOfContent={{
        style: 'clerk',
        footer: (
          <div className="my-3 space-y-3">
            <ScrollTop />
          </div>
        ),
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {page.data._openapi || page.slugs.includes('whitepapers') ? (
        <></>
      ) : (
        <div className="flex flex-row flex-wrap gap-2 items-center border-b pb-6">
          {/* <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/${page.path}`}
        /> */}
          <LLMCopyButton markdownUrl={markdownUrl} />
          <ViewOptions
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/${page.path}`}
          />
        </div>
      )}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows linking to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/[...slug]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const image = getPageImage(page);
  const md = getPageMarkdownUrl(page);
  return {
    title: page.data.title,
    description: page.data.description,
    metadataBase: process.env.NEXT_PUBLIC_BASE_URL,
    alternates: {
      ...(page.data.url ? {} : { canonical: page.url }),
      types: {
        'text/markdown': md.url,
      },
    },
    openGraph: {
      title: page.data.title,
      ...(page.data.description ? { description: page.data.description } : {}),
      url: page.url,
      type: 'article',
      images: {
        url: image.url,
        width: 1200,
        height: 630,
        alt: page.data.title,
      },
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      ...(page.data.description ? { description: page.data.description } : {}),
      images: image.url,
    },
  };
}
