import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border border-[#16130f] bg-[#fbf8f0] px-2.5 py-1 text-xs font-medium text-[#16130f]",
        className
      )}
    >
      {children}
    </span>
  );
}
