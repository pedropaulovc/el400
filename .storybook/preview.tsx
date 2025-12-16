import type { Preview } from "@storybook/react";
import "../src/index.css";

/**
 * Storybook preview configuration
 * 
 * Note: Forced-colors mode emulation is now handled using browser's native
 * page.emulateMedia({ forcedColors: 'active' }) API in story play functions.
 * This provides true browser-level forced-colors emulation instead of CSS simulation.
 */

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dro-housing",
      values: [
        { name: "dro-housing", value: "#474747" },
        { name: "dark", value: "#1a1a1a" },
        { name: "light", value: "#f5f5f5" },
      ],
    },
  },
};

export default preview;