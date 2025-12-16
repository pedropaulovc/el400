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
  title: "Components/LEDIndicator/ForcedColors",
  component: LEDIndicator,
  parameters: {
    docs: { disable: true },
  },
} satisfies Meta<typeof LEDIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

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

    const isTransparent = isTransparentColor(inactiveStyle.color);
    expect(isTransparent).toBe(true);

    const bgColor = getComputedStyle(active!.parentElement ?? active!).backgroundColor;
    let effectiveBg = bgColor;
    if (isTransparentColor(bgColor)) {
      const temp = document.createElement("div");
      temp.style.backgroundColor = "Canvas";
      temp.style.display = "none";
      document.body.appendChild(temp);
      const canvasColor = getComputedStyle(temp).backgroundColor;
      document.body.removeChild(temp);
      effectiveBg = isTransparentColor(canvasColor)
        ? getComputedStyle(document.body).backgroundColor
        : canvasColor;
    }

    const fgRgb = parseColor(activeStyle.color);
    const bgRgb = parseColor(effectiveBg);
    if (!fgRgb || !bgRgb) {
      throw new Error("Unable to resolve colors for contrast check");
    }
    const contrastRatio = getContrastRatio(fgRgb, bgRgb);
    expect(contrastRatio).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);
  },
};

