// import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {NextConfig} from 'next';
import {createMDX} from 'fumadocs-mdx/next';
import {ghPagesUrl, gitConfig} from './src/lib/shared';

const withMDX = createMDX();
const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "true"
const isVercelBuild = process.env.VERCEL === "1"
const isLocalBuild = !isGitHubPagesBuild && !isVercelBuild

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

const config: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  env: {
    NEXT_CONFIG: 'static',
    NEXT_PUBLIC_BASE_URL: resolveBaseUrl(),
    NEXT_PUBLIC_BASE_PATH: resolveBasePath() ?? '',
  },
  basePath: resolveBasePath(),
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  images: { unoptimized: true },
  serverExternalPackages: ["typescript"],
  ...(isLocalBuild ? {
    experimental: {
      cpus: 4,
      workerThreads: false,
    },
  } : {}),
};

export default withMDX(config);
