"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type CollapsibleTextProps = {
  description: string;
  className?: string;
  collapsedClassName?: string;
  threshold?: number;
  buttonClassName?: string;
};

const MOBILE_COLLAPSE_THRESHOLD = 150;

export function CollapsibleText({
  buttonClassName,
  className,
  collapsedClassName = "line-clamp-3 md:line-clamp-none",
  description,
  threshold = MOBILE_COLLAPSE_THRESHOLD
}: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = description.trim().length > threshold;

  return (
    <div className="max-w-3xl">
      <p
        className={cn(
          "text-base leading-7 text-[#4b4439]",
          className,
          canCollapse && !expanded ? collapsedClassName : ""
        )}
      >
        {description}
      </p>
      {canCollapse ? (
        <button
          className={cn("mt-2 text-sm text-[#16130f] underline underline-offset-4", buttonClassName)}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function CollapsibleProjectDescription(props: CollapsibleTextProps) {
  return <CollapsibleText {...props} buttonClassName={cn("md:hidden", props.buttonClassName)} />;
}
