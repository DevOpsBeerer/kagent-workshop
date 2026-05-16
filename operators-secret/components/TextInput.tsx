import { forwardRef, type InputHTMLAttributes } from "react";
import "./TextInput.css";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "text" | "email" | "password" | "search" | "tel" | "url" | "number";
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { type = "text", className, ...rest },
  ref,
) {
  const classes = ["ds-text-input", className].filter(Boolean).join(" ");
  return <input ref={ref} type={type} className={classes} {...rest} />;
});
