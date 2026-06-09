import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "w-full rounded-xl border border-[#ddd4c6] bg-[#fffdf9] px-3.5 py-2.5 text-sm text-[#1f1d19] outline-none ring-offset-white placeholder:text-[#7b7264] focus:border-[#c5a65a] focus:ring-4 focus:ring-[#f1e7d1]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = "Input";
