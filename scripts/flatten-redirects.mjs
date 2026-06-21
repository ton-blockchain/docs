/*─────────────────────────────────────────────────────────────────────────────╗
│                                  IMPORTANT:                                  │
│  Run this script from the root of the docs, not from the scripts directory!  │
╞══════════════════════════════════════════════════════════════════════════════╡
│  This script "flattens" redirect chains, making every redirect source point  │
│  directly to its final destination, reducing the redirect depth to 1.        │
│                                                                              │
│  Command to run the script:                                                  │
│  $ node scripts/flatten-redirects.mjs                                        │
╚─────────────────────────────────────────────────────────────────────────────*/

// Common utils
import { composeSuccess, getConfig, writeConfig, getRedirects } from './common.mjs';

/**
 * Flatten source → destination routes in all redirect chains in docs.json
 */
const flattenRedirects = () => {
  const config = getConfig();
  const redirects = getRedirects(config);
  const uniqueReds = new Map();
  redirects.forEach((redirect) => {
    if (uniqueReds.has(redirect.source)) {
      throw new Error(`Duplicate redirect source: ${redirect.source}`);
    }
    uniqueReds.set(redirect.source, redirect.destination);
  });

  const flattened = redirects.map((redirect) => {
    const visited = new Set([redirect.source]);
    const trace = [redirect.source];
    let destination = redirect.destination;
    let fragment = '';

    while (true) {
      const nextFragment = destination.match(/#.*$/)?.[0];
      if (nextFragment) { fragment = nextFragment; }
      const path = destination.replace(/#.*$/, '');
      trace.push(path);
      if (!uniqueReds.has(path)) {
        return {
          ...redirect,
          destination: path + fragment,
        }
      }
      if (visited.has(path)) {
        throw new Error(`Circular redirect found: ${trace.join(' → ')}`);
      }
      visited.add(path);
      destination = uniqueReds.get(path);
    }
  });

  const updatedConfig = {
    ...config,
    redirects: flattened,
  };
  const toBeChanged = redirects.filter(
    (redirect, index) => redirect.destination !== flattened[index].destination,
  ).length;

  writeConfig(updatedConfig);
  console.log(composeSuccess(`Flattened ${toBeChanged} of ${redirects.length} redirects.`));
};

const main = () => {
  console.log('🏁 Flattening redirects in docs.json...');
  flattenRedirects();
};

main();
