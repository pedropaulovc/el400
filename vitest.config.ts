import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    silent: true,
    // Real-DOM integration tests (e.g. the setup-menu suites) drive dozens of
    // sequential userEvent clicks; as the setup registry grows each story adds
    // navigation clicks, and under the loaded CI coverage run those tests slow to
    // ~5s — right at vitest's 5000ms default, causing false timeouts (not
    // assertion failures). Raise the per-test timeout to give contention-sensitive
    // tests headroom. Does NOT relax any assertion — only stops killing slow but
    // correct tests. Mirrors the CI step-timeout bump made as the suite grew.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/tests/**',
        'src/**/*.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
