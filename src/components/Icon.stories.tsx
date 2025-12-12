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
    alt: "Setup",
  },
};

export const PrimaryFunctionIcons: Story = {
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="setup" alt="Setup" />
        </DROButton>
        <span className="text-xs text-white">Setup</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="abs-inc" alt="Abs/Inc" />
        </DROButton>
        <span className="text-xs text-white">Abs/Inc</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="inch-mm" alt="Inch/MM" />
        </DROButton>
        <span className="text-xs text-white">Inch/MM</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="reference" alt="Reference" />
        </DROButton>
        <span className="text-xs text-white">Reference</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="icon" className="p-0">
          <Icon name="preset" alt="Preset" />
        </DROButton>
        <span className="text-xs text-white">Preset</span>
      </div>
    </div>
  ),
};

export const SecondaryFunctionIcons: Story = {
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="bolt-hole-pcd-function" alt="Bolt hole" />
        </DROButton>
        <span className="text-xs text-white">Bolt Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="arc-contouring-function" alt="Arc contour" />
        </DROButton>
        <span className="text-xs text-white">Arc Contour</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="angle-hole-function" alt="Angle hole" />
        </DROButton>
        <span className="text-xs text-white">Angle Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="grid-hole-function" alt="Grid hole" />
        </DROButton>
        <span className="text-xs text-white">Grid Hole</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="calculator" alt="Calculator" />
        </DROButton>
        <span className="text-xs text-white">Calculator</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="half-function" alt="Half" />
        </DROButton>
        <span className="text-xs text-white">Half</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="sdm-function" alt="SDM" />
        </DROButton>
        <span className="text-xs text-white">SDM</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton variant="dark" size="icon" className="p-0">
          <Icon name="function" alt="Function" />
        </DROButton>
        <span className="text-xs text-white">Function</span>
      </div>
    </div>
  ),
};

export const KeypadIcons: Story = {
  render: () => (
    <div className="flex gap-4 items-center flex-wrap bg-gray-800 p-4">
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-0" alt="0" />
        </DROButton>
        <span className="text-xs text-white">Number 0</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-1" alt="1" />
        </DROButton>
        <span className="text-xs text-white">Number 1</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-2" alt="2" />
        </DROButton>
        <span className="text-xs text-white">Number 2</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-3" alt="3" />
        </DROButton>
        <span className="text-xs text-white">Number 3</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-4" alt="4" />
        </DROButton>
        <span className="text-xs text-white">Number 4</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-5" alt="5" />
        </DROButton>
        <span className="text-xs text-white">Number 5</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-6" alt="6" />
        </DROButton>
        <span className="text-xs text-white">Number 6</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-7" alt="7" />
        </DROButton>
        <span className="text-xs text-white">Number 7</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-8" alt="8" />
        </DROButton>
        <span className="text-xs text-white">Number 8</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="number-9" alt="9" />
        </DROButton>
        <span className="text-xs text-white">Number 9</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="dot" alt="Dot" />
        </DROButton>
        <span className="text-xs text-white">Dot</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="toggle-sign" alt="Toggle sign" />
        </DROButton>
        <span className="text-xs text-white">+/-</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="cancel" alt="Cancel" />
        </DROButton>
        <span className="text-xs text-white">Cancel</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DROButton size="square" className="p-0">
          <Icon name="enter" alt="Enter" />
        </DROButton>
        <span className="text-xs text-white">Enter</span>
      </div>
    </div>
  ),
};
