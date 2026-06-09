import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#e7dcc7] bg-[#f7f0df] px-2.5 py-1 text-xs font-medium text-[#4d3f22]",
        className
      )}
    >
      {children}
    </span>
  );
}
