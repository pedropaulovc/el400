import type { Meta, StoryObj } from "@storybook/react-vite";
import Icon from "./Icon";
import DROButton from "./DROButton";

const meta = {
  title: "Components/Icon",
  component: Icon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    name: {
      control: "text",
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "setup",
  },
};

export const PrimaryFunctionIcons: Story = {
  args: { name: "setup" },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="setup" />
        </DROButton>
        <span className="text-xs text-white">Setup</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="abs-inc" />
        </DROButton>
        <span className="text-xs text-white">Abs/Inc</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="inch-mm" />
        </DROButton>
        <span className="text-xs text-white">Inch/MM</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="reference" />
        </DROButton>
        <span className="text-xs text-white">Reference</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="preset" />
        </DROButton>
        <span className="text-xs text-white">Preset</span>
      </div>
    </div>
  ),
};

export const SecondaryFunctionIcons: Story = {
  args: { name: "bolt-hole-pcd-function" },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="bolt-hole-pcd-function" />
        </DROButton>
        <span className="text-xs text-white">Bolt Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="arc-contouring-function" />
        </DROButton>
        <span className="text-xs text-white">Arc Contour</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="angle-hole-function" />
        </DROButton>
        <span className="text-xs text-white">Angle Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="grid-hole-function" />
        </DROButton>
        <span className="text-xs text-white">Grid Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="calculator" />
        </DROButton>
        <span className="text-xs text-white">Calculator</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="half-function" />
        </DROButton>
        <span className="text-xs text-white">Half</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="sdm-function" />
        </DROButton>
        <span className="text-xs text-white">SDM</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="function" />
        </DROButton>
        <span className="text-xs text-white">Function</span>
      </div>
    </div>
  ),
};

export const KeypadIcons: Story = {
  args: { name: "number-0" },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-0" />
        </DROButton>
        <span className="text-xs text-white">Number 0</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-1" />
        </DROButton>
        <span className="text-xs text-white">Number 1</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-2" />
        </DROButton>
        <span className="text-xs text-white">Number 2</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-3" />
        </DROButton>
        <span className="text-xs text-white">Number 3</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-4" />
        </DROButton>
        <span className="text-xs text-white">Number 4</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-5" />
        </DROButton>
        <span className="text-xs text-white">Number 5</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-6" />
        </DROButton>
        <span className="text-xs text-white">Number 6</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-7" />
        </DROButton>
        <span className="text-xs text-white">Number 7</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-8" />
        </DROButton>
        <span className="text-xs text-white">Number 8</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-9" />
        </DROButton>
        <span className="text-xs text-white">Number 9</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="dot" />
        </DROButton>
        <span className="text-xs text-white">Dot</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="toggle-sign" />
        </DROButton>
        <span className="text-xs text-white">+/-</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="cancel" />
        </DROButton>
        <span className="text-xs text-white">Cancel</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="enter" />
        </DROButton>
        <span className="text-xs text-white">Enter</span>
      </div>
    </div>
  ),
};
