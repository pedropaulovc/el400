import path from 'path';
import { createRequire } from 'module';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// The browser-mode server loads addon-vitest's setup file by absolute path. When
// running from a git worktree, dependencies resolve up to the MAIN repo's
// node_modules (a sibling of the worktree, not under the Vite root), so Vite's
// `server.fs.allow` guard rejects it and the browser import fails with "Failed to
// fetch dynamically imported module". Derive the real node_modules root from
// resolution and allow it; in CI / the primary checkout this is already under the
// root, so the extra entry is a harmless no-op.
const require = createRequire(import.meta.url);
const realRepoRoot = path.resolve(
  require.resolve('@storybook/addon-vitest/package.json'),
  '../../../..'
);

// https://storybook.js.org/docs/writing-tests/vitest-plugin
export default defineConfig({
  server: {
    fs: {
      allow: [__dirname, realRepoRoot],
    },
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(__dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(__dirname, '.storybook-forced-colors') }),
        ],
        test: {
          name: 'storybook-forced-colors',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: {
                forcedColors: 'active',
              },
            }),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'storybook/test',
      '@storybook/react',
    ],
  },
});
