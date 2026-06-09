import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#e5ddce] bg-[#fdfbf7] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04),0_14px_28px_rgba(18,18,18,0.06)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </section>
  );
}
