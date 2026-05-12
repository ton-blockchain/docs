/**
 * TypeScript shim that re-exports the small helpers TS callers need from
 * `scripts/nav-config.mjs`. The script is the canonical source of nav
 * helpers (read/write config, frontmatter munging, deterministic JSON
 * serializer); duplicating them would risk drift. We keep this shim narrow
 * so .ts/.tsx code (e.g. the nav-editor API routes) never reaches for the
 * .mjs path directly.
 */
import {stableStringify as stableStringifyImpl} from "../../scripts/nav-config.mjs"

/**
 * Deterministic JSON serializer. Object keys are ordered by the shared
 * `KEY_PRIORITY`, output is 2-space indented, and the file ends with a
 * trailing newline. The editor API routes use this so a save produces
 * byte-identical output to `npm run nav:apply`'s `writeConfig`.
 */
export const stableStringify: (value: unknown) => string = stableStringifyImpl
