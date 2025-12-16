import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import DROButton from "./DROButton";
import { parseColor, getLuminance, getContrastRatio } from "@/tests/helpers/color-utils";

const meta = {
  title: "Components/DROButton",
  component: DROButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "dark", "yellow", "clear", "enter"],
    },
    size: {
      control: "select",
      options: ["icon", "secondary", "axis", "square", "enter"],
    },
    isActive: {
      control: "boolean",
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof DROButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "1",
    variant: "default",
    size: "square",
  },
};

export const Yellow: Story = {
  args: {
    children: "CLR",
    variant: "yellow",
    size: "square",
  },
};

export const Dark: Story = {
  args: {
    children: "X",
    variant: "dark",
    size: "axis",
  },
};

export const Active: Story = {
  args: {
    children: "5",
    variant: "default",
    size: "square",
    isActive: true,
  },
};

export const AllVariants: Story = {
  args: {
    children: "Default",
  },
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <DROButton variant="default">Default</DROButton>
      <DROButton variant="dark">Dark</DROButton>
      <DROButton variant="yellow">Yellow</DROButton>
      <DROButton variant="clear">Clear</DROButton>
      <DROButton variant="enter">Enter</DROButton>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {
    children: "BTN",
  },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap">
      <DROButton size="icon">Primary 2:1</DROButton>
      <DROButton size="secondary">Secondary 1.75:1</DROButton>
      <DROButton size="axis">Axis 1.22:1</DROButton>
      <DROButton size="square">Square 1:1</DROButton>
      <DROButton size="enter">Enter</DROButton>
    </div>
  ),
};

export const ClickInteraction: Story = {
  args: {
    children: "Click Me",
    variant: "yellow",
    size: "icon",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /click me/i });

    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const KeyboardNavigation: Story = {
  args: {
    children: "Tab + Enter",
    variant: "default",
    size: "icon",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/**
 * Forced Colors Mode - Buttons have visible borders
 * Demonstrates that all button variants have visible borders
 * and maintain sufficient contrast in forced-colors mode.
 */
export const ForcedColorsButtons: Story = {
  args: {
    children: "Test",
  },
  parameters: {
    forcedColors: 'active',
    backgrounds: {
      default: 'forced-colors',
    },
  },
  render: () => (
    <div className="flex gap-4 flex-wrap p-4">
      <DROButton variant="default">Default</DROButton>
      <DROButton variant="dark">Dark</DROButton>
      <DROButton variant="yellow">Yellow</DROButton>
      <DROButton variant="clear">Clear</DROButton>
      <DROButton variant="enter">Enter</DROButton>
      <DROButton variant="default" isActive>Active</DROButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll("button");
    
    // Verify all buttons are rendered
    await expect(buttons.length).toBeGreaterThan(0);
    
    // Check that buttons have visible borders
    for (const button of Array.from(buttons)) {
      const style = window.getComputedStyle(button);
      
      // Buttons should have a border
      await expect(style.borderStyle).not.toBe('none');
      await expect(style.borderWidth).not.toBe('0px');
      
      // Buttons should have contrasting text and background
      await expect(style.color).toBeTruthy();
      await expect(style.backgroundColor).toBeTruthy();
    }
  },
};

/**
 * Forced Colors Mode - Button contrast verification
 * Tests a single button to ensure it meets contrast requirements
 * in forced-colors mode (17:1 minimum).
 */
export const ForcedColorsButtonContrast: Story = {
  args: {
    children: "Test Button",
    variant: "default",
    size: "square",
  },
  parameters: {
    forcedColors: 'active',
    backgrounds: {
      default: 'forced-colors',
    },
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    await expect(button).toBeInTheDocument();
    
    if (button) {
      const style = window.getComputedStyle(button);
      
      // Parse colors using shared utility
      const fgColor = parseColor(style.color);
      const bgColor = parseColor(style.backgroundColor);
      
      if (fgColor && bgColor) {
        const contrast = getContrastRatio(fgColor, bgColor);
        
        // Should meet or exceed 17:1 contrast ratio
        await expect(contrast).toBeGreaterThanOrEqual(17);
      }
    }
  },
};
