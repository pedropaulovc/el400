import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  APPROX_EQUAL_CONTRAST_RATIO,
  MIN_HIGH_CONTRAST_RATIO,
  getContrastRatio,
  isTransparentColor,
  parseColor,
} from "../tests/contrast-utils";
import SevenSegmentDigit from "./SevenSegmentDigit";

const meta = {
  title: "Components/SevenSegmentDigit/ForcedColors",
  component: SevenSegmentDigit,
  parameters: {
    docs: { disable: true },
  },
} satisfies Meta<typeof SevenSegmentDigit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedColorsContrast: Story = {
  args: {
    value: "0",
    showDecimal: false,
  },
  render: (args) => (
    <div data-testid="forced-colors-digit" style={{ width: "60px", height: "80px" }}>
      <SevenSegmentDigit {...args} />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    await step("locate digit", async () => {
      const wrapper = canvasElement.querySelector("[data-testid='forced-colors-digit']") as HTMLElement | null;
      await expect(wrapper).toBeInTheDocument();

      const digit = wrapper?.querySelector(".seven-segment-digit") as HTMLElement | null;
      await expect(digit).toBeInTheDocument();
      await waitFor(() => {
        expect(digit!.querySelectorAll("span").length).toBeGreaterThan(0);
      });

      const segments = Array.from(digit!.querySelectorAll("span")) as HTMLElement[];
      const parentBg = getComputedStyle(digit!.parentElement ?? digit!).backgroundColor;
      let effectiveParentBg = parentBg;
      if (isTransparentColor(parentBg)) {
        const temp = document.createElement("div");
        temp.style.backgroundColor = "Canvas";
        temp.style.display = "none";
        document.body.appendChild(temp);
        const canvasColor = getComputedStyle(temp).backgroundColor;
        document.body.removeChild(temp);
        effectiveParentBg = isTransparentColor(canvasColor)
          ? getComputedStyle(document.body).backgroundColor
          : canvasColor;
      }

      const litSegment = segments.find((segment) => {
        const bg = getComputedStyle(segment).backgroundColor;
        return !isTransparentColor(bg);
      });

      const offSegment = segments.find((segment) => {
        const bg = getComputedStyle(segment).backgroundColor;
        return isTransparentColor(bg);
      });

      if (!litSegment || !offSegment) {
        throw new Error("Unable to locate lit/off segments in forced-colors mode");
      }

      const litBg = getComputedStyle(litSegment).backgroundColor;
      const offBg = getComputedStyle(offSegment).backgroundColor;
      const isTransparent = isTransparentColor(offBg);

      const litRgb = parseColor(litBg);
      const offRgb = parseColor(isTransparent ? effectiveParentBg : offBg);
      const bgRgb = parseColor(effectiveParentBg);

      if (!litRgb || !offRgb || !bgRgb) {
        throw new Error("Unable to resolve colors for contrast checks");
      }

      const litContrast = getContrastRatio(litRgb, bgRgb);
      expect(litContrast).toBeGreaterThanOrEqual(MIN_HIGH_CONTRAST_RATIO);

      const offContrast = getContrastRatio(offRgb, bgRgb);
      expect(offContrast).toBeLessThan(APPROX_EQUAL_CONTRAST_RATIO);
    });
  },
};
