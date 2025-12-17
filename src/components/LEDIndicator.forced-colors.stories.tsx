import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  MIN_ACCESSIBLE_CONTRAST_RATIO,
  getContrastRatio,
  getEffectiveBackgroundColor,
  isTransparentColor,
  parseColor,
} from "../tests/contrast-utils";
import LEDIndicator from "./LEDIndicator";

const meta = {
  title: "Components/LEDIndicator/ForcedColors",
  component: LEDIndicator,
  parameters: {
    // Disabled in docs as these are test-only stories for forced-colors mode validation
    docs: { disable: true },
  },
} satisfies Meta<typeof LEDIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedColorsStates: Story = {
  args: {
    label: "ON",
    isOn: true,
  },
  render: () => (
    <div className="flex gap-4 items-center">
      <LEDIndicator label="ON" isOn />
      <LEDIndicator label="OFF" isOn={false} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const active = canvasElement.querySelector(".mode-indicator-active");
    const inactive = canvasElement.querySelector(".mode-indicator-inactive");

    await expect(active).toBeInTheDocument();
    await expect(inactive).toBeInTheDocument();

    const activeStyle = getComputedStyle(active!);
    const inactiveStyle = getComputedStyle(inactive!);

    expect(activeStyle.textShadow).toBe("none");

    const isTransparent = isTransparentColor(inactiveStyle.color);
    expect(isTransparent).toBe(true);

    const effectiveBg = getEffectiveBackgroundColor(active as HTMLElement);

    const fgRgb = parseColor(activeStyle.color);
    const bgRgb = parseColor(effectiveBg);
    if (!fgRgb || !bgRgb) {
      throw new Error("Unable to resolve colors for contrast check");
    }
    const contrastRatio = getContrastRatio(fgRgb, bgRgb);
    expect(contrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);
  },
};

