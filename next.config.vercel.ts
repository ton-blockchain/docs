import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const isVercelProd = resolveBaseUrl().startsWith('https://docs.ton.org');

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
  experimental: {
    useTypeScriptCli: true,
  },
  serverExternalPackages: ['typescript'],
};

export default withMDX(config);
