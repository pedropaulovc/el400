import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import LEDIndicator from "./LEDIndicator";

const meta = {
  title: "Components/LEDIndicator",
  component: LEDIndicator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOn: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof LEDIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default LED indicator in OFF state.
 * Displays with dimmed styling.
 */
export const Off: Story = {
  args: {
    label: "ABS",
    isOn: false,
  },
};

/**
 * LED indicator in ON state.
 * Shows bright styling with text shadow glow effect.
 */
export const On: Story = {
  args: {
    label: "ABS",
    isOn: true,
  },
};

/**
 * Visual showcase of all LED states side-by-side.
 * Useful for design review and visual regression testing.
 */
export const AllStates: Story = {
  args: {
    label: "ALL",
    isOn: false,
  },
  render: () => (
    <div className="flex gap-4 items-center">
      <LEDIndicator label="OFF" isOn={false} />
      <LEDIndicator label="ON" isOn={true} />
    </div>
  ),
};

/**
 * Forced Colors Mode - LED Indicators
 * Shows how LED indicators appear in Windows High Contrast mode.
 * Active indicators are clearly visible, inactive ones blend with background.
 */
export const ForcedColorsLEDs: Story = {
  args: {
    label: "TEST",
    isOn: false,
  },
  parameters: {
    forcedColors: 'active',
    backgrounds: {
      default: 'forced-colors',
    },
  },
  render: () => (
    <div className="flex gap-4 items-center p-4" style={{ background: '#000' }}>
      <div>
        <div className="text-white mb-2 text-xs">Active (visible):</div>
        <LEDIndicator label="ABS" isOn={true} />
      </div>
      <div>
        <div className="text-white mb-2 text-xs">Inactive (transparent):</div>
        <LEDIndicator label="INC" isOn={false} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Find active and inactive indicators
    const activeIndicator = canvasElement.querySelector('.mode-indicator-active');
    const inactiveIndicator = canvasElement.querySelector('.mode-indicator-inactive');
    
    // Verify they exist
    await expect(activeIndicator).toBeInTheDocument();
    await expect(inactiveIndicator).toBeInTheDocument();
    
    if (activeIndicator) {
      const activeStyle = window.getComputedStyle(activeIndicator);
      // Active indicator should have visible color (not transparent)
      await expect(activeStyle.color).not.toBe('transparent');
      // Active indicator should not have glow effect (text-shadow)
      await expect(activeStyle.textShadow).toBe('none');
    }
    
    if (inactiveIndicator) {
      const inactiveStyle = window.getComputedStyle(inactiveIndicator);
      // Inactive indicator should be transparent to blend with background
      // Browsers may return 'transparent' or 'rgba(0, 0, 0, 0)'
      const isTransparent = inactiveStyle.color === 'transparent' || 
                           inactiveStyle.color === 'rgba(0, 0, 0, 0)';
      await expect(isTransparent).toBe(true);
    }
  },
};
