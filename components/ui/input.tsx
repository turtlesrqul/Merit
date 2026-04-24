import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "w-full rounded-xl border border-ink-200 bg-white/90 px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white placeholder:text-ink-500 focus:border-sun-400 focus:ring-4 focus:ring-sun-100",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = "Input";
