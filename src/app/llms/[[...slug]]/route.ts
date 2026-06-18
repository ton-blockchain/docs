import { getLLMText, getPageMarkdownUrl, getIndexablePages, source } from '@/lib/source';
import { withBaseUrl } from '@/lib/shared';
import { notFound, redirect } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/llms/[[...slug]]'>) {
  const { slug } = await params;
  if (slug?.at(-1) === 'llms') {
    redirect(withBaseUrl('/llms.txt'), 'replace');
  }

  // remove the appended "content.md"
  const page = source.getPage(slug?.slice(0, -1));
  if (!page || page.data.url) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

export function generateStaticParams() {
  return getIndexablePages().map((page) => ({
    slug: getPageMarkdownUrl(page).segments,
  }));
}
