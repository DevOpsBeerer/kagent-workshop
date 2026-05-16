import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextInput } from "./TextInput";

const meta = {
  title: "Design System/TextInput",
  component: TextInput,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { placeholder: "Placeholder" },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Focused: Story = {
  args: { className: "is-focused" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AllStates: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
      <TextInput {...args} />
      <TextInput {...args} className="is-focused" />
      <TextInput {...args} disabled />
    </div>
  ),
};
