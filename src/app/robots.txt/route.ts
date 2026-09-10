import { isIndexable, withBaseUrl } from '@/lib/shared';

export const dynamic = 'force-static';
export const revalidate = false;

export function GET() {
  const body = isIndexable
    ? [
        'User-agent: *',
        'Allow: /',
        'Content-Signal: ai-train=no, search=yes, ai-input=no',
        '',
        `Sitemap: ${withBaseUrl('/sitemap.xml')}`,
        '',
      ].join('\n')
    : [
        'User-agent: *',
        'Disallow: /',
        'Content-Signal: ai-train=no, search=no, ai-input=no',
        '',
      ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
