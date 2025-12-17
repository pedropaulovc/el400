import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  MIN_HIGH_CONTRAST_RATIO,
  getContrastRatio,
  getEffectiveBackgroundColor,
  parseColor,
} from "../tests/contrast-utils";
import BeveledFrame from "./BeveledFrame";

const meta = {
  title: "Components/BeveledFrame/ForcedColors",
  component: BeveledFrame,
  parameters: {
    // Disabled in docs as these are test-only stories for forced-colors mode validation
    docs: { disable: true },
  },
} satisfies Meta<typeof BeveledFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedColorsBorderContrast: Story = {
  args: {
    children: <div style={{ padding: "20px" }}>Content</div>,
  },
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const frame = canvasElement.querySelector("div > div") as HTMLElement | null;
    await expect(frame).toBeInTheDocument();

    const style = getComputedStyle(frame!);

    // Verify border is 2px
    const borderWidth = style.borderWidth;
    expect(borderWidth).toBe("2px");

    // Get border color (in forced-colors mode, transparent becomes a system color)
    const borderColor = style.borderColor;
    const borderRgb = parseColor(borderColor);
    if (!borderRgb) {
      throw new Error(`Unable to parse border color: ${borderColor}`);
    }

    // Get effective background color
    const effectiveBg = getEffectiveBackgroundColor(frame!);
    const bgRgb = parseColor(effectiveBg);
    if (!bgRgb) {
      throw new Error(`Unable to parse background color: ${effectiveBg}`);
    }

    // Verify border has at least 20:1 contrast against background
    const contrastRatio = getContrastRatio(borderRgb, bgRgb);
    expect(contrastRatio).toBeGreaterThanOrEqual(MIN_HIGH_CONTRAST_RATIO);
  },
};
