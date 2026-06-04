// Constants
export const appName = 'TON Docs';
export const docsRoute = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/`;
export const docsImageRoute = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/og`;
export const docsContentRoute = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/llms.txt`;
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
