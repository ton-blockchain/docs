// import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {NextConfig} from 'next';
import {createMDX} from 'fumadocs-mdx/next';

const withMDX = createMDX();

const resolveBaseUrl = () => {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicUrl !== undefined && publicUrl !== "") {
    return publicUrl
  }

  if (process.env.VERCEL_URL !== undefined && process.env.VERCEL_URL !== "") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000"
};

const config: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_URL: resolveBaseUrl(),
  },
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  serverExternalPackages: ["typescript"],
  // NOTE: placed intentionally to not forget about doing redirects properly, via a server.
  // redirects: () => JSON.parse(readFileSync('./docs.json', 'utf8')),
};

export default withMDX(config);
