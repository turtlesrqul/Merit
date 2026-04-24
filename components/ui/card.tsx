import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-ink-100 bg-white/95 p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_rgba(16,24,40,0.06)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </section>
  );
}
