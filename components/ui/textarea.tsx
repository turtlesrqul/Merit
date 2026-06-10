import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[104px] w-full rounded-none border border-[#d7cebd] bg-[#f4f0e8] px-3 py-2 text-sm text-[#16130f] outline-none placeholder:text-[#887d6c] focus:border-[#16130f] focus:ring-2 focus:ring-[#f3c945]/45",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
