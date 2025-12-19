import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
  MIN_ACCESSIBLE_CONTRAST_RATIO,
  getContrastRatio,
  getEffectiveBackgroundColor,
  parseColor,
} from "../tests/contrast-utils";
import DROButton from "./DROButton";

const meta = {
  title: "Components/DROButton/ForcedColors",
  component: DROButton,
  parameters: {
    // Disabled in docs as these are test-only stories for forced-colors mode validation
    docs: { disable: true },
  },
} satisfies Meta<typeof DROButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedColorsHighContrast: Story = {
  args: {
    children: "Forced Colors",
    variant: "default",
    size: "square",
    title: "Forced Colors Button",
  },
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    const style = getComputedStyle(button);

    // Verify button has visible 2px border
    expect(style.borderStyle).not.toBe("none");
    expect(style.borderWidth).toBe("2px");

    // Verify text-to-background contrast
    const fgRgb = parseColor(style.color);
    const bgRgb = parseColor(style.backgroundColor);

    if (!fgRgb || !bgRgb) {
      throw new Error("Unable to resolve colors for contrast check");
    }

    const textContrastRatio = getContrastRatio(fgRgb, bgRgb);
    expect(textContrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);

    // Verify border-to-background contrast (17:1 or better)
    const borderColor = style.borderColor;
    const borderRgb = parseColor(borderColor);
    const effectiveBg = getEffectiveBackgroundColor(button);
    const effectiveBgRgb = parseColor(effectiveBg);

    if (!borderRgb || !effectiveBgRgb) {
      throw new Error(`Unable to resolve border (${borderColor}) or background (${effectiveBg}) for contrast check`);
    }

    const borderContrastRatio = getContrastRatio(borderRgb, effectiveBgRgb);
    expect(borderContrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);
  },
};

