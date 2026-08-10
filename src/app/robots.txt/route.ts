import { withBaseUrl } from '@/lib/shared';

export const dynamic = 'force-static';
export const revalidate = false;

export function GET() {
  const isTestDomain = ['vercel-dev', 'local', 'github', 'unknown'].includes(
    process.env.NEXT_BUILD_TYPE ?? '',
  );
  const accessRule = isTestDomain ? 'Disallow: /' : 'Allow: /';
  const contentSignal = `Content-Signal: ai-train=no, search=${isTestDomain ? 'no' : 'yes'}, ai-input=no`;

  return new Response(
    `${[
      `User-agent: *`,
      accessRule,
      contentSignal,
      '',
      `Sitemap: ${withBaseUrl('/sitemap.xml')}`,
    ].join('\n')}\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
}
