import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "border border-[#e4bb35] bg-[#f4cf59] text-[#171512] shadow-sm hover:border-[#dbb12a] hover:bg-[#f7d66f]",
  secondary:
    "border border-[#ddd4c6] bg-[#fdfbf6] text-[#27231c] shadow-sm hover:border-[#e4bb35] hover:bg-[#fff7dd]",
  ghost: "bg-transparent text-[#4a4337] hover:bg-[#fff3cf]",
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
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantMap[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
