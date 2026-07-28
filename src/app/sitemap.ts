import type { MetadataRoute } from 'next';
import { getIndexablePages } from '@/lib/source';
import { withBaseUrl } from '@/lib/shared';

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docsPages = await Promise.all(
    getIndexablePages().map(async (page) => {
      // NOTE: Consider enabling https://www.fumadocs.dev/docs/mdx/last-modified
      // const {lastModified} = page.data;
      const sitemapUrl: MetadataRoute.Sitemap[number] = {
        url: withBaseUrl(page.url),
        changeFrequency: 'weekly',
        priority: 0.7,
      };
      return sitemapUrl;
    }),
  );

  return [
    {
      url: withBaseUrl('/'),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: withBaseUrl('/llms.txt'),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...docsPages,
  ];
}
