import type { Meta, StoryObj } from "@storybook/react-vite";
import { OperatorDetailModal } from "./OperatorDetailModal";

const meta = {
  title: "Design System/OperatorDetailModal",
  component: OperatorDetailModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    open: true,
    onClose: () => {},
    operatorId: "01",
    secret: "jo8ri4uoilrwjhf",
  },
} satisfies Meta<typeof OperatorDetailModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongId: Story = {
  args: { operatorId: 1234, secret: "x9z2k7m4n8p3q1w" },
};
