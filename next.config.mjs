import {fileURLToPath} from "node:url";
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// .variables

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  serverExternalPackages: ["typescript", "twoslash"],
};

export default withMDX(config);
