import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import SevenSegmentDigit from "./SevenSegmentDigit";

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
    <div data-testid="forced-colors-digit" style={{ width: "60px", height: "80px" }}>
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

    const litSegment = segments.find((segment) => {
      const bg = getComputedStyle(segment).backgroundColor;
      return bg !== "transparent" && !/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(bg);
    }) ?? segments[0];

    const offSegment = segments.find((segment) => {
      const bg = getComputedStyle(segment).backgroundColor;
      return bg === "transparent" || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(bg);
    }) ?? segments[segments.length - 1];

    const litBg = getComputedStyle(litSegment).backgroundColor;
    const offBg = getComputedStyle(offSegment).backgroundColor;
    const isTransparent = offBg === "none" || offBg === "transparent" || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(offBg);

    const litRgb = parseColor(litBg);
    const offRgb = parseColor(isTransparent ? parentBg : offBg);
    const bgRgb = parseColor(parentBg);

    const litContrast = getContrastRatio(litRgb, bgRgb);
    expect(litContrast).toBeGreaterThanOrEqual(20);

    const offContrast = getContrastRatio(offRgb, bgRgb);
    expect(offContrast).toBeLessThan(1.5);
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
