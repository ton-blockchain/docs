// Constants
const pathPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const appName = 'TON Docs';
// Next.js automatically prepends `basePath` to sidebar and page <Link> hrefs.
// Do not include the prefix here lest you want to double it (e.g. /docs/docs/... on GitHub Pages).
export const docsRoute = `/`;
export const docsImageRoute = `${pathPrefix}/og`;
export const docsContentRoute = `${pathPrefix}/llms.mdx`;
export const gitConfig = {
  user: 'ton-org',
  repo: 'docs',
  branch: 'main',
};
export const ghPagesUrl = `https://${gitConfig.user}.github.io/${gitConfig.repo}`;

// Functions
export function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
