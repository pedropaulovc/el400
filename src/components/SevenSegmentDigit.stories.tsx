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
  title: "Components/SevenSegmentDigit",
  component: SevenSegmentDigit,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1a1a1a" }],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "select",
      options: [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "-", " ",
        "A", "b", "C", "c", "d", "E", "F", "G", "h", "I", "i", "J", "L", "l",
        "n", "m", "P", "r", "S", "t", "U", "v", "X", "Y"
      ],
    },
    showDecimal: {
      control: "boolean",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "60px", height: "80px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SevenSegmentDigit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = {
  args: {
    value: "0",
    showDecimal: false,
  },
};

export const One: Story = {
  args: {
    value: "1",
    showDecimal: false,
  },
};

export const Eight: Story = {
  args: {
    value: "8",
    showDecimal: false,
  },
};

export const WithDecimal: Story = {
  args: {
    value: "5",
    showDecimal: true,
  },
};

export const Minus: Story = {
  args: {
    value: "-",
    showDecimal: false,
  },
};

export const Blank: Story = {
  args: {
    value: " ",
    showDecimal: false,
  },
};

export const AllDigits: Story = {
  args: {
    value: "0",
  },
  render: () => (
    <div className="flex gap-1" style={{ background: "#1a1a1a", padding: "20px" }}>
      {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <div key={digit} style={{ width: "40px", height: "60px" }}>
          <SevenSegmentDigit value={digit} />
        </div>
      ))}
    </div>
  ),
};

export const DisplayNumber: Story = {
  args: {
    value: "-",
  },
  render: () => (
    <div className="flex gap-0.5" style={{ background: "#1a1a1a", padding: "20px" }}>
      {["-", "1", "2", "3"].map((digit, index) => (
        <div key={index} style={{ width: "40px", height: "60px" }}>
          <SevenSegmentDigit value={digit} showDecimal={index === 2} />
        </div>
      ))}
    </div>
  ),
};

export const RendersAllSegmentsAndDecimal: Story = {
  args: {
    value: "8",
    showDecimal: true,
  },
  play: async ({ canvasElement }) => {
    const digit = canvasElement.querySelector(".seven-segment-digit");
    await expect(digit).toBeInTheDocument();

    // Check all 7 segments are on for digit 8
    const segmentsOn = canvasElement.querySelectorAll(".seg-on");
    await expect(segmentsOn.length).toBe(8); // 7 segments + decimal

    // Check decimal point is on
    const decimalOn = canvasElement.querySelector(".seg-dp.seg-on");
    await expect(decimalOn).toBeInTheDocument();
  },
};

export const ForcedColorsContrast: Story = {
  args: {
    value: "0",
    showDecimal: false,
  },
  parameters: {
    docs: { disable: true },
  },
  render: (args) => (
    <div
      data-testid="forced-colors-digit"
      style={{ width: "60px", height: "80px", backgroundColor: "Canvas", color: "CanvasText" }}
    >
      <SevenSegmentDigit {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia("(forced-colors: active)").matches).toBe(true);

    const wrapper = canvasElement.querySelector("[data-testid='forced-colors-digit']") as HTMLElement | null;
    await expect(wrapper).toBeInTheDocument();

    const digit = wrapper?.querySelector(".seven-segment-digit") as HTMLElement | null;
    await expect(digit).toBeInTheDocument();
    await waitFor(() => {
      expect(digit!.querySelectorAll("span").length).toBeGreaterThan(0);
    });

    const segments = Array.from(digit!.querySelectorAll("span")) as HTMLElement[];
    const parentBg = getComputedStyle(digit!.parentElement ?? digit!).backgroundColor;
    const effectiveParentBg = isTransparentColor(parentBg) ? "rgb(255, 255, 255)" : parentBg;

    const litSegment = segments.find((segment) => {
      const bg = getComputedStyle(segment).backgroundColor;
      return !isTransparentColor(bg);
    }) ?? segments[0];

    const offSegment = segments.find((segment) => {
      const bg = getComputedStyle(segment).backgroundColor;
      return isTransparentColor(bg);
    }) ?? segments[segments.length - 1];

    const litBg = getComputedStyle(litSegment).backgroundColor;
    const offBg = getComputedStyle(offSegment).backgroundColor;
    const isTransparent = isTransparentColor(offBg);

    const litRgb = parseColor(litBg);
    const offRgb = parseColor(isTransparent ? effectiveParentBg : offBg);
    const bgRgb = parseColor(effectiveParentBg);

    const litContrast = getContrastRatio(litRgb, bgRgb);
    expect(litContrast).toBeGreaterThanOrEqual(MIN_HIGH_CONTRAST_RATIO);

    const offContrast = getContrastRatio(offRgb, bgRgb);
    expect(offContrast).toBeLessThan(APPROX_EQUAL_CONTRAST_RATIO);
  },
};

// Letter examples
export const LetterA: Story = {
  args: {
    value: "A",
    showDecimal: false,
  },
};

export const Letterb: Story = {
  args: {
    value: "b",
    showDecimal: false,
  },
};

export const LetterE: Story = {
  args: {
    value: "E",
    showDecimal: false,
  },
};

export const LetterP: Story = {
  args: {
    value: "P",
    showDecimal: false,
  },
};

export const AllLetters: Story = {
  args: {
    value: "A",
  },
  render: () => (
    <div className="flex flex-wrap gap-1" style={{ background: "#1a1a1a", padding: "20px", maxWidth: "600px" }}>
      {["A", "b", "C", "c", "d", "E", "F", "G", "h", "I", "i", "J", "L", "l", "n", "m", "P", "r", "S", "t", "U", "v", "X", "Y"].map((char) => (
        <div key={char} style={{ width: "40px", height: "60px" }}>
          <SevenSegmentDigit value={char} />
        </div>
      ))}
    </div>
  ),
};

export const SampleWord: Story = {
  args: {
    value: "h",
  },
  render: () => (
    <div className="flex gap-0.5" style={{ background: "#1a1a1a", padding: "20px" }}>
      {["h", "E", "L", "L"].map((char, index) => (
        <div key={index} style={{ width: "40px", height: "60px" }}>
          <SevenSegmentDigit value={char} />
        </div>
      ))}
    </div>
  ),
};
