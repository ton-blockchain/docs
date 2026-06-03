// import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createMDX} from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  serverExternalPackages: ["typescript"],
  // NOTE: placed intentionally to not forget about doing redirects properly, via a server.
  // redirects: () => JSON.parse(readFileSync('./docs.json', 'utf8')),
};

export default withMDX(config);
