/*─────────────────────────────────────────────────────────────────────────────╗
│                                  IMPORTANT:                                  │
│  Run this script from the root of the docs, not from the scripts directory!  │
╞══════════════════════════════════════════════════════════════════════════════╡
│  This is a pre-build script that either runs fast important checks or        │
│  augments source code or .mdx contents for the build.                        │
│  Prerequisite for the build, must always run before it starts.               │
│                                                                              │
│  Command to run the script:                                                  │
│  $ node scripts/pre-build.mjs                                                │
╚─────────────────────────────────────────────────────────────────────────────*/

// Common utils
import { $ } from './common.mjs';

const main = () => {
  const pfx = 'pre-build:';
  const scripts = ['check:types', 'check:openapi', 'check:links', 'check:navigation', 'check:redirects'];
  for (const script of scripts) {
    console.log(pfx, `running ${script}...`);
    if (!$(`npm run ${script}`).ok) return;
  }
};

main();
