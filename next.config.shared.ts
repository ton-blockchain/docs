// import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {NextConfig} from 'next';
import {createMDX} from 'fumadocs-mdx/next';
import {ghPagesUrl, gitConfig} from '@/lib/shared';

const withMDX = createMDX();
const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "true"

type DocsNextConfigOptions = {
  staticExport: boolean;
};

const resolveBaseUrl = (staticExport: boolean) => {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicUrl !== undefined && publicUrl !== "") {
    return publicUrl
  }

  if (staticExport && isGitHubPagesBuild) {
    return ghPagesUrl;
  }

  if (!staticExport && process.env.VERCEL_URL !== undefined && process.env.VERCEL_URL !== "") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000"
};

const resolveBasePath = (staticExport: boolean) => {
  if (staticExport && isGitHubPagesBuild) {
    return `/${gitConfig.repo}`
  }

  return undefined
};

const resolveAssetPrefix = (staticExport: boolean) => {
  if (staticExport && isGitHubPagesBuild) {
    return ghPagesUrl;
  }

  return undefined
};

export const createDocsNextConfig = ({staticExport}: DocsNextConfigOptions) => {
  const config: NextConfig = {
    ...(staticExport ? {output: 'export'} : {}),
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_BASE_URL: resolveBaseUrl(staticExport),
    },
    basePath: resolveBasePath(staticExport),
    assetPrefix: resolveAssetPrefix(staticExport),
    turbopack: {
      root: fileURLToPath(new URL(".", import.meta.url)),
    },
    serverExternalPackages: ["typescript"],
    // NOTE: placed intentionally to not forget about doing redirects properly, via a server.
    // redirects: () => JSON.parse(readFileSync('./docs.json', 'utf8')),
  };

  return withMDX(config);
};
