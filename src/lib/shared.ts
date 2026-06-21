// Constants
const pathPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const urlPrefix = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
export const appName = 'TON Docs';
// Next.js automatically prepends `basePath` to sidebar and page <Link> hrefs.
// Do not include the prefix here lest you want to double it (e.g. /docs/docs/... on GitHub Pages).
export const docsRoute = `/`;
export const docsImageRoute = `/og`;
export const docsContentRoute = `/llms`;
export const gitConfig = {
  user: process.env.NEXT_GIT_USER ?? 'ton-org',
  repo: process.env.NEXT_GIT_REPO ?? 'docs',
  branch: process.env.NEXT_GIT_BRANCH ?? 'main',
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

export function withBasePath(src: string): string {
  const normalizedPrefix = pathPrefix.length > 1 ? pathPrefix.replace(/\/+$/, '') : pathPrefix;
  // locally or not on GitHub Pages
  if (!normalizedPrefix) return src;
  // external, relative, or data:
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  // already prefixed
  if (src === normalizedPrefix || src.startsWith(normalizedPrefix + '/')) return src;
  //
  return normalizedPrefix + src;
}

export function withBaseUrl(src: string): string {
  // locally or not on GitHub Pages
  if (!urlPrefix) return src;
  // external, relative, or data:
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  return urlPrefix + src;
}
