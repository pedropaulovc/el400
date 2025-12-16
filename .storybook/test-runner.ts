import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async preVisit(page, context) {
    // Emulate @media (forced-colors: active) for stories that have forcedColors parameter
    // or are specifically testing forced-colors mode
    const storyId = context.id;
    const isForcedColorsStory = storyId.includes('forced-colors') || 
                                storyId.includes('forcedcolors');
    
    if (isForcedColorsStory) {
      await page.emulateMedia({ forcedColors: 'active' });
    }
  },
};

export default config;
