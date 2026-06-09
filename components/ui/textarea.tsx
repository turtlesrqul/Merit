import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-[#ddd4c6] bg-[#fffdf9] px-3.5 py-2.5 text-sm text-[#1f1d19] outline-none ring-offset-white placeholder:text-[#7b7264] focus:border-[#c5a65a] focus:ring-4 focus:ring-[#f1e7d1]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
