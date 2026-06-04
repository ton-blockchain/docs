// Constants
const pathPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const appName = 'TON Docs'
export const docsRoute = `${pathPrefix}/`;
export const docsImageRoute = `${pathPrefix}/og`;
export const docsContentRoute = `${pathPrefix}/llms.txt`;
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
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
