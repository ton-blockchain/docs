import {fileURLToPath} from "node:url"
import {createMDX} from "fumadocs-mdx/next"
import {redirects} from "./redirects.mjs"

const withMDX = createMDX()

const docsRoot = fileURLToPath(new URL(".", import.meta.url))

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash"],
  images: {unoptimized: true},
  turbopack: {
    root: docsRoot,
  },
  redirects: async () => redirects,
}

export default withMDX(config)
