import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-ink-200 bg-white/90 px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white placeholder:text-ink-500 focus:border-sun-400 focus:ring-4 focus:ring-sun-100",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
