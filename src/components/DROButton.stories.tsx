import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import DROButton from "./DROButton";

const meta = {
  title: "Components/DROButton",
  component: DROButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "dark", "yellow", "clear", "enter"],
    },
    size: {
      control: "select",
      options: ["icon", "secondary", "axis", "square", "enter"],
    },
    isActive: {
      control: "boolean",
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof DROButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "1",
    variant: "default",
    size: "square",
  },
};

export const Yellow: Story = {
  args: {
    children: "CLR",
    variant: "yellow",
    size: "square",
  },
};

export const Dark: Story = {
  args: {
    children: "X",
    variant: "dark",
    size: "axis",
  },
};

export const Active: Story = {
  args: {
    children: "5",
    variant: "default",
    size: "square",
    isActive: true,
  },
};

export const AllVariants: Story = {
  args: {
    children: "Default",
  },
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <DROButton variant="default">Default</DROButton>
      <DROButton variant="dark">Dark</DROButton>
      <DROButton variant="yellow">Yellow</DROButton>
      <DROButton variant="clear">Clear</DROButton>
      <DROButton variant="enter">Enter</DROButton>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {
    children: "BTN",
  },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap">
      <DROButton size="icon">Primary 2:1</DROButton>
      <DROButton size="secondary">Secondary 1.75:1</DROButton>
      <DROButton size="axis">Axis 1.22:1</DROButton>
      <DROButton size="square">Square 1:1</DROButton>
      <DROButton size="enter">Enter</DROButton>
    </div>
  ),
};

export const ClickInteraction: Story = {
  args: {
    children: "Click Me",
    variant: "yellow",
    size: "icon",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /click me/i });

    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const KeyboardNavigation: Story = {
  args: {
    children: "Tab + Enter",
    variant: "default",
    size: "icon",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalled();
  },
};
