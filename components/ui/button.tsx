import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "border border-sun-500 bg-gradient-to-b from-sun-300 to-sun-400 text-ink-950 shadow-[0_1px_0_rgba(16,24,40,0.18)] hover:from-sun-200 hover:to-sun-300",
  secondary:
    "border border-ink-200 bg-white text-ink-900 shadow-sm hover:border-sun-300 hover:bg-sun-50",
  ghost: "bg-transparent text-ink-700 hover:bg-sun-50",
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
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variantMap[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
