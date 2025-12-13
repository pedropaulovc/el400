import type { Meta, StoryObj } from "@storybook/react-vite";
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
