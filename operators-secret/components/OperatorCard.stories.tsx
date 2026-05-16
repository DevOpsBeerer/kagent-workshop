import type { Meta, StoryObj } from "@storybook/react-vite";
import { OperatorCard } from "./OperatorCard";

const meta = {
  title: "Design System/OperatorCard",
  component: OperatorCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { id: "01" },
} satisfies Meta<typeof OperatorCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NumericId: Story = {
  args: { id: 42 },
};

export const Grid: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", gap: 24 }}>
      <OperatorCard id="01" />
      <OperatorCard id="02" />
      <OperatorCard id="03" />
    </div>
  ),
};
