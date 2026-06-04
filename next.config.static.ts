// import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {NextConfig} from 'next';
import {createMDX} from 'fumadocs-mdx/next';
import {ghPagesUrl, gitConfig} from '@/lib/shared';

const withMDX = createMDX();
const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "true"

const resolveBaseUrl = () => {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicUrl !== undefined && publicUrl !== "") {
    return publicUrl
  }

  if (isGitHubPagesBuild) {
    return ghPagesUrl;
  }

  return "http://localhost:3000"
};

const resolveBasePath = () => {
  if (isGitHubPagesBuild) {
    return `/${gitConfig.repo}`
  }

  return undefined
};

const resolveAssetPrefix = () => {
  if (isGitHubPagesBuild) {
    return ghPagesUrl;
  }

  return undefined
};

const config: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  pageExtensions: ['static.ts', 'static.tsx', 'mdx', 'md', 'jsx', 'js', 'tsx', 'ts'],
  env: {
    NEXT_CONFIG: 'static',
    NEXT_PUBLIC_BASE_URL: resolveBaseUrl(),
  },
  basePath: resolveBasePath(),
  assetPrefix: resolveAssetPrefix(),
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  serverExternalPackages: ["typescript"],
  // NOTE: placed intentionally to not forget about doing redirects properly, via a server.
  // redirects: () => JSON.parse(readFileSync('./docs.json', 'utf8')),
};

export default withMDX(config);
