// Env
export const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "true"

// Constants
export const appName = 'TON Docs';
export const docsRoute = `${isGitHubPagesBuild ? '/docs' : ''}/`;
export const docsImageRoute = `${isGitHubPagesBuild ? '/docs' : ''}/og`;
export const docsContentRoute = `${isGitHubPagesBuild ? '/docs' : ''}/llms.txt`;
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
