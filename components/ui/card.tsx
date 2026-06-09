import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-none border border-[#d7cebd] bg-[#eee8dd] p-5 shadow-none",
        className
      )}
    >
      {children}
    </section>
  );
}
