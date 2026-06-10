"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type SkillTagsToggleProps = {
  skills: string[];
  limit?: number;
};

export function SkillTagsToggle({ limit = 8, skills }: SkillTagsToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const uniqueSkills = Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));
  const visibleSkills = isExpanded ? uniqueSkills : uniqueSkills.slice(0, limit);
  const hasOverflow = uniqueSkills.length > limit;

  if (uniqueSkills.length === 0) {
    return <p className="text-sm text-[#7b705f]">No skills added yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {visibleSkills.map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
      </div>
      {hasOverflow ? (
        <button
          className="text-sm text-[#16130f] underline underline-offset-4 hover:text-[#8c6d00]"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "Show less" : "Show all skills"}
        </button>
      ) : null}
    </div>
  );
}
