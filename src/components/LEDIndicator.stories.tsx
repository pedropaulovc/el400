import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within, expect } from "storybook/test";
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
    isInteractive: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof LEDIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Visual Documentation Stories
// ============================================================================

/**
 * Default LED indicator in OFF state.
 * Non-interactive, displays with dimmed styling.
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
 * Interactive LED indicator (acts as a radio button).
 * Clickable and keyboard-navigable.
 */
export const Interactive: Story = {
  args: {
    label: "MODE",
    isOn: false,
    isInteractive: true,
    onClick: fn(),
  },
};

/**
 * Interactive LED with group label for accessibility.
 * Shows how to use groupLabel for radio button groups.
 */
export const WithGroupLabel: Story = {
  args: {
    label: "ABS",
    isOn: true,
    isInteractive: true,
    onClick: fn(),
    groupLabel: "Coordinate Mode",
  },
};

/**
 * Example of interactive behavior with click handling.
 * Try clicking to see the onClick handler triggered.
 */
export const InteractiveDemo: Story = {
  args: {
    label: "TOGGLE",
    isOn: false,
    isInteractive: true,
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("radio");

    // Demonstrate the click interaction
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
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
    <div className="flex gap-6 flex-col">
      <div className="flex gap-4 items-center">
        <span className="text-sm text-gray-400 w-32">Non-Interactive:</span>
        <LEDIndicator label="OFF" isOn={false} />
        <LEDIndicator label="ON" isOn={true} />
      </div>
      <div className="flex gap-4 items-center">
        <span className="text-sm text-gray-400 w-32">Interactive:</span>
        <LEDIndicator label="INT-OFF" isOn={false} isInteractive onClick={() => {}} />
        <LEDIndicator label="INT-ON" isOn={true} isInteractive onClick={() => {}} />
      </div>
    </div>
  ),
};
