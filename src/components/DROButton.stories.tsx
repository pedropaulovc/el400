import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import DROButton from "./DROButton";

const parseColor = (color: string): [number, number, number] => {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  if (color === "none" || color === "transparent") {
    return [0, 0, 0];
  }
  throw new Error(`Cannot parse color: ${color}`);
};

const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

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

export const ForcedColorsHighContrast: Story = {
  args: {
    children: "Forced Colors",
    variant: "default",
    size: "square",
  },
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    const style = getComputedStyle(button);

    expect(style.borderStyle).not.toBe("none");
    expect(style.borderWidth).not.toBe("0px");

    const fgRgb = parseColor(style.color);
    const bgRgb = parseColor(style.backgroundColor);
    const contrastRatio = getContrastRatio(fgRgb, bgRgb);

    expect(contrastRatio).toBeGreaterThanOrEqual(17);
  },
};
