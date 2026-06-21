import type { MetadataRoute } from 'next';
import { withBaseUrl } from '@/lib/shared';

export const revalidate = false;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dictionaries', '/grammars'],
    },
    sitemap: withBaseUrl('/sitemap.xml'),
  };
}
