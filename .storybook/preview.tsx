import React from "react";
import type { Preview, Decorator } from "@storybook/react";
import "../src/index.css";

/**
 * Decorator to emulate forced-colors mode (Windows High Contrast)
 * Applies system color palette to simulate forced-colors: active
 */
const withForcedColors: Decorator = (Story, context) => {
  const forcedColors = context.parameters.forcedColors || context.globals.forcedColors;
  
  if (forcedColors === 'active') {
    return (
      <div 
        className="forced-colors-emulation"
        style={{
          // Emulate forced-colors mode using CSS custom properties
          // These match Windows High Contrast system colors
          '--forced-canvas': '#000000',
          '--forced-canvas-text': '#ffffff',
          '--forced-button-face': '#1a1a1a',
          '--forced-button-text': '#ffffff',
          '--forced-highlight': '#1aebff',
        } as React.CSSProperties}
      >
        <style>
          {`
            .forced-colors-emulation {
              /* Simulate forced-colors: active media query */
              background: var(--forced-canvas);
            }
            
            .forced-colors-emulation .seg-on {
              background-color: var(--forced-canvas-text) !important;
              filter: none !important;
            }
            
            .forced-colors-emulation .seg-off {
              background-color: transparent !important;
            }
            
            .forced-colors-emulation button.dro-button {
              forced-color-adjust: none;
              background-color: var(--forced-button-face) !important;
              background-image: none !important;
              color: var(--forced-button-text) !important;
              border-color: var(--forced-button-text) !important;
            }
            
            .forced-colors-emulation .mode-indicator-active {
              color: var(--forced-canvas-text) !important;
              text-shadow: none !important;
            }
            
            .forced-colors-emulation .mode-indicator-inactive {
              color: transparent !important;
            }
            
            .forced-colors-emulation .icon path,
            .forced-colors-emulation .icon polygon,
            .forced-colors-emulation .icon ellipse,
            .forced-colors-emulation .icon circle,
            .forced-colors-emulation .icon rect {
              fill: var(--forced-button-text) !important;
            }
          `}
        </style>
        <Story />
      </div>
    );
  }
  
  return <Story />;
};

const preview: Preview = {
  decorators: [withForcedColors],
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
        { name: "forced-colors", value: "#000000" },
      ],
    },
  },
  globalTypes: {
    forcedColors: {
      name: 'Forced Colors',
      description: 'Emulate Windows High Contrast mode',
      defaultValue: 'none',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'none', title: 'None', icon: 'circlehollow' },
          { value: 'active', title: 'Active (High Contrast)', icon: 'circle' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;