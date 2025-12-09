import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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

export const Off: Story = {
  args: {
    label: "ABS",
    isOn: false,
  },
};

export const On: Story = {
  args: {
    label: "ABS",
    isOn: true,
  },
};

export const Interactive: Story = {
  args: {
    label: "INC",
    isOn: false,
    isInteractive: true,
    onClick: fn(),
  },
};

export const InteractiveOn: Story = {
  args: {
    label: "MM",
    isOn: true,
    isInteractive: true,
    onClick: fn(),
  },
};

export const AllStates: Story = {
  args: {
    label: "OFF",
    isOn: false,
  },
  render: () => (
    <div className="flex gap-6">
      <LEDIndicator label="OFF" isOn={false} />
      <LEDIndicator label="ON" isOn={true} />
      <LEDIndicator label="INT" isOn={false} isInteractive onClick={() => {}} />
      <LEDIndicator label="INT-ON" isOn={true} isInteractive onClick={() => {}} />
    </div>
  ),
};

export const ClickInteraction: Story = {
  args: {
    label: "TOGGLE",
    isOn: false,
    isInteractive: true,
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("radio");

    await expect(button).toBeInTheDocument();
    await expect(button).toHaveAttribute("aria-checked", "false");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const AccessibilityStatus: Story = {
  args: {
    label: "STATUS",
    isOn: true,
    isInteractive: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");

    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute("aria-label", "STATUS: active");
  },
};
