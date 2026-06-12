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

export default async function Page(props: PageProps<'/[...slug]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();
  if (page.data.url) {
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

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      {page.data._openapi ? (
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

export async function generateMetadata(
  props: PageProps<'/[...slug]'>,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const image = getPageImage(page);
  const md = getPageMarkdownUrl(page);
  return {
    title: page.data.title,
    description: page.data.description,
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
