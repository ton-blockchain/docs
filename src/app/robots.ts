import type { MetadataRoute } from 'next';
import { withBaseUrl } from '@/lib/shared';

export const revalidate = false;

export default function robots(): MetadataRoute.Robots {
  const isTestDomain = ['vercel-dev', 'local', 'github', 'unknown'].includes(
    process.env.NEXT_BUILD_TYPE ?? '',
  );
  return {
    rules: isTestDomain ? { userAgent: '*', disallow: '/' } : { userAgent: '*', allow: '/' },
    sitemap: withBaseUrl('/sitemap.xml'),
  };
}
