import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal } from "./Modal";
import { Button } from "./Button";

const meta = {
  title: "Design System/Modal",
  component: Modal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { open: true, onClose: () => {}, children: <p>Modal content goes here.</p> },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Toggleable: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Demo modal">
          <h2 style={{ marginTop: 0 }}>Demo modal</h2>
          <p>Click backdrop or press ESC to close.</p>
        </Modal>
      </div>
    );
  },
};
