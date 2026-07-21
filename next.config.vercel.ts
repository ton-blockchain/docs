import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import type { Redirect } from 'next/dist/lib/load-custom-routes';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const isVercelProd = resolveBaseUrl().startsWith('https://docs.ton.org');

type DocsConfig = {
  redirects?: Redirect[];
};

function resolveBaseUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicUrl !== undefined && publicUrl !== '') {
    return publicUrl;
  }

  if (process.env.VERCEL_URL !== undefined && process.env.VERCEL_URL !== '') {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

function loadDocsRedirects(): Redirect[] {
  const docsConfig = JSON.parse(
    readFileSync(new URL('./docs.json', import.meta.url), 'utf8'),
  ) as DocsConfig;

  return docsConfig.redirects ?? [];
}

const config: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_CONFIG: 'vercel',
    NEXT_PUBLIC_BASE_URL: resolveBaseUrl(),
    NEXT_BUILD_TYPE: isVercelProd ? 'vercel' : 'vercel-dev',
  },
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
  serverExternalPackages: ['typescript'],
  redirects: async () => loadDocsRedirects(),
  rewrites: async () => ({
    beforeFiles: [
      {
        // Map `.md` requests to LLM Markdown sources
        source: '/:path((?!llms/|og/|api/|_next/).+)\\.md',
        destination: '/llms/:path/content.md',
      },
    ],
  }),
};

export default withMDX(config);
