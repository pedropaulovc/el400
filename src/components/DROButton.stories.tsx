import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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
      options: ["sm", "md", "lg", "wide", "square"],
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
    size: "md",
  },
};

export const Yellow: Story = {
  args: {
    children: "CLR",
    variant: "yellow",
    size: "wide",
  },
};

export const Dark: Story = {
  args: {
    children: "X",
    variant: "dark",
    size: "lg",
  },
};

export const Active: Story = {
  args: {
    children: "5",
    variant: "default",
    size: "md",
    isActive: true,
  },
};

export const AllVariants: Story = {
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
  render: () => (
    <div className="flex gap-4 items-center flex-wrap">
      <DROButton size="sm">SM</DROButton>
      <DROButton size="md">MD</DROButton>
      <DROButton size="lg">LG</DROButton>
      <DROButton size="wide">Wide</DROButton>
      <DROButton size="square">SQ</DROButton>
    </div>
  ),
};

export const ClickInteraction: Story = {
  args: {
    children: "Click Me",
    variant: "yellow",
    size: "wide",
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
    size: "wide",
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
