import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { getPageImage, source } from '@/lib/source';
import { generate, getImageResponseOptions } from '@/lib/og';
import { withBaseUrl } from '@/lib/shared';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    generate({
      title: page.data.title,
      url: withBaseUrl(page.url).replace(/^https?:\/\//, '').replace(/\/+$/, ''),
      description: page.data.description,
    }),
    getImageResponseOptions(),
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
