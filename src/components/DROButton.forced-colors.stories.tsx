import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MIN_ACCESSIBLE_CONTRAST_RATIO, getContrastRatio, parseColor } from "../tests/contrast-utils";
import DROButton from "./DROButton";

const meta = {
  title: "Components/DROButton/ForcedColors",
  component: DROButton,
  parameters: {
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

    if (!fgRgb || !bgRgb) {
      throw new Error("Unable to resolve colors for contrast check");
    }

    const contrastRatio = getContrastRatio(fgRgb, bgRgb);

    expect(contrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);
  },
};

