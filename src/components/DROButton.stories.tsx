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
    title: "Button 1",
  },
};

export const Yellow: Story = {
  args: {
    children: "CLR",
    variant: "yellow",
    size: "square",
    title: "Clear",
  },
};

export const Dark: Story = {
  args: {
    children: "X",
    variant: "dark",
    size: "axis",
    title: "X Axis",
  },
};

export const Active: Story = {
  args: {
    children: "5",
    variant: "default",
    size: "square",
    isActive: true,
    title: "Button 5",
  },
};

export const AllVariants: Story = {
  args: {
    children: "Default",
    title: "Example Button",
  },
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <DROButton variant="default" title="Default">Default</DROButton>
      <DROButton variant="dark" title="Dark">Dark</DROButton>
      <DROButton variant="yellow" title="Yellow">Yellow</DROButton>
      <DROButton variant="clear" title="Clear">Clear</DROButton>
      <DROButton variant="enter" title="Enter">Enter</DROButton>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {
    children: "BTN",
    title: "Example Button",
  },
  render: () => (
    <div className="flex gap-4 items-center flex-wrap">
      <DROButton size="icon" title="Primary 2:1">Primary 2:1</DROButton>
      <DROButton size="secondary" title="Secondary 1.75:1">Secondary 1.75:1</DROButton>
      <DROButton size="axis" title="Axis 1.22:1">Axis 1.22:1</DROButton>
      <DROButton size="square" title="Square 1:1">Square 1:1</DROButton>
      <DROButton size="enter" title="Enter">Enter</DROButton>
    </div>
  ),
};

export const ClickInteraction: Story = {
  args: {
    children: "Click Me",
    variant: "yellow",
    size: "icon",
    title: "Click Me",
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
    title: "Tab + Enter",
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
