import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Design System/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "Button", variant: "primary", size: "md" },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: "sm" },
};

export const Hover: Story = {
  args: { className: "is-hovered" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AllStates: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
      <Button {...args}>Button</Button>
      <Button {...args} className="is-hovered">Button</Button>
      <Button {...args} disabled>Button</Button>
    </div>
  ),
};
