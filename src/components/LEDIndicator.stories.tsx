import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  MIN_ACCESSIBLE_CONTRAST_RATIO,
  getContrastRatio,
  isTransparentColor,
  parseColor,
} from "../tests/contrast-utils";
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

export const ForcedColorsStates: Story = {
  render: () => (
    <div className="flex gap-4 items-center" style={{ backgroundColor: "Canvas", padding: "8px" }}>
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

    const isTransparent = isTransparentColor(inactiveStyle.color);
    expect(isTransparent).toBe(true);

    const bgColor = getComputedStyle(active!.parentElement ?? active!).backgroundColor;
    const effectiveBg = isTransparentColor(bgColor) ? "rgb(255, 255, 255)" : bgColor;
    const fgRgb = parseColor(activeStyle.color);
    const bgRgb = parseColor(effectiveBg);
    const contrastRatio = getContrastRatio(fgRgb, bgRgb);
    expect(contrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);
  },
};
