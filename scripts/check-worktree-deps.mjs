/**
 * Preflight for `test:storybook`: fail fast with an actionable message when this
 * checkout's dependencies do not live under the project root.
 *
 * Why this exists: Storybook runs its stories through Vitest's browser mode,
 * whose Vite server loads `@storybook/addon-vitest`'s setup file by ABSOLUTE
 * path. Vite's `server.fs.allow` guard only serves files under the project root.
 * In a git worktree WITHOUT its own `node_modules`, dependencies resolve up to
 * the main repo's `node_modules` (a sibling of the worktree, outside the Vite
 * root), so the browser import dies with the opaque "Failed to fetch dynamically
 * imported module" — with no hint that the real problem is a missing install.
 *
 * Each git worktree needs its OWN `node_modules` (a real `npm ci`, not a symlink
 * — Vite resolves symlinks to their real path, which is still outside the root).
 * This check turns the cryptic Vite failure into a one-line "run npm ci here".
 *
 * Unit tests (Node) and E2E (Vite dev server bundles deps) both work deps-free
 * via Node's upward resolution, so ONLY storybook needs this guard.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
// Project root = parent of this scripts/ dir, derived from the script location so
// the check is correct regardless of the invoking cwd.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The package whose absolute-path browser import is what actually breaks.
const PROBE = '@storybook/addon-vitest/package.json';

function fail(message) {
  process.stderr.write(`\n\x1b[31mERROR: ${message}\x1b[39m\n\n`);
  process.exit(1);
}

let resolved;
try {
  resolved = require.resolve(PROBE);
} catch {
  fail(
    `dependencies are not installed in this checkout.\n` +
      `Run:  npm ci`
  );
}

// If the resolved dependency lives outside the project root, Vite's browser-mode
// fs.allow guard will reject it. `path.relative` starting with '..' means outside.
if (path.relative(root, resolved).startsWith('..')) {
  const nmRoot = path.resolve(resolved, '../../../..');
  fail(
    `node_modules resolves OUTSIDE this worktree\n` +
      `(${path.join(nmRoot, 'node_modules')}).\n` +
      `Storybook's Vite browser mode needs node_modules under the worktree root.\n` +
      `Run:  npm ci`
  );
}
