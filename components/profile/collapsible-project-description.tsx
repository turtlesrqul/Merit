"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type CollapsibleProjectDescriptionProps = {
  description: string;
};

const MOBILE_COLLAPSE_THRESHOLD = 150;

export function CollapsibleProjectDescription({ description }: CollapsibleProjectDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = description.trim().length > MOBILE_COLLAPSE_THRESHOLD;

  return (
    <div className="max-w-3xl">
      <p
        className={cn(
          "text-base leading-7 text-[#4b4439]",
          canCollapse && !expanded ? "line-clamp-3 md:line-clamp-none" : ""
        )}
      >
        {description}
      </p>
      {canCollapse ? (
        <button
          className="mt-2 text-sm text-[#16130f] underline underline-offset-4 md:hidden"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
