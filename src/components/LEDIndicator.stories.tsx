import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import LEDIndicator from "./LEDIndicator";

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

export const ForcedColorsStates: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <LEDIndicator label="ON" isOn />
      <LEDIndicator label="OFF" isOn={false} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const active = canvasElement.querySelector(".mode-indicator-active") as HTMLElement | null;
    const inactive = canvasElement.querySelector(".mode-indicator-inactive") as HTMLElement | null;

    await expect(active).toBeInTheDocument();
    await expect(inactive).toBeInTheDocument();

    const activeStyle = getComputedStyle(active!);
    const inactiveStyle = getComputedStyle(inactive!);

    expect(activeStyle.textShadow).toBe("none");

    const isTransparent = inactiveStyle.color === "transparent" || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(inactiveStyle.color);
    expect(isTransparent).toBe(true);

    const bgColor = getComputedStyle(active!.parentElement ?? active!).backgroundColor;
    const fgRgb = parseColor(activeStyle.color);
    const bgRgb = parseColor(bgColor);
    const contrastRatio = getContrastRatio(fgRgb, bgRgb);
    expect(contrastRatio).toBeGreaterThanOrEqual(17);
  },
};
