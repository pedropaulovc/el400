import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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

    const svg = canvasElement.querySelector("svg");

    await expect(svg).toBeInTheDocument();
    const polygons = canvasElement.querySelectorAll("polygon");
    await expect(polygons.length).toBe(7);
    const circle = canvasElement.querySelector("circle");
    await expect(circle).toBeInTheDocument();
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
