import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "w-full rounded-none border border-[#d7cebd] bg-[#f4f0e8] px-3.5 py-2.5 text-sm text-[#16130f] outline-none placeholder:text-[#887d6c] focus:border-[#16130f] focus:ring-2 focus:ring-[#f3c945]/45",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = "Input";
