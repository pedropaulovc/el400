import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async preVisit(page) {
    // Emulate @media (forced-colors: active)
    await page.emulateMedia({ forcedColors: 'active' });
  },
};

export default config;
