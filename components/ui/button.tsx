import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "border border-[#d9ae19] bg-[#f3c945] text-[#11100e] hover:bg-[#f6d45d]",
  secondary:
    "border border-[#16130f] bg-transparent text-[#11100e] hover:bg-[#ebe3d6]",
  ghost: "border border-transparent bg-transparent text-[#4a4337] hover:border-[#d7cebd]",
  danger: "bg-red-600 text-white hover:bg-red-700"
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-none px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variantMap[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
