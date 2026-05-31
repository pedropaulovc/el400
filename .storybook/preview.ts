import type { Preview } from "@storybook/react";
import "../src/index.css";

// Named exports so configs that compose this preview (e.g.
// .storybook-forced-colors) can re-export them. Storybook 10.4 + Vite treat
// re-exporting missing named bindings as a hard error.
export const parameters: Preview["parameters"] = {
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
};

export const decorators: Preview["decorators"] = [];

const preview: Preview = { parameters, decorators };

export default preview;
