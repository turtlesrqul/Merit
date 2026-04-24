"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CandidateDirectoryItem } from "@/lib/db/opportunities";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CandidateExplorerProps = {
  candidates: CandidateDirectoryItem[];
};

export function CandidateExplorer({ candidates }: CandidateExplorerProps) {
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedSkill = skillFilter.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const searchable = [candidate.name ?? "", candidate.headline ?? "", candidate.bio ?? ""]
        .join(" ")
        .toLowerCase();

      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);
      const matchesSkill =
        normalizedSkill.length === 0 ||
        candidate.topSkills.some((skill) => skill.toLowerCase().includes(normalizedSkill));

      return matchesQuery && matchesSkill;
    });
  }, [candidates, query, skillFilter]);

  return (
    <Card className="space-y-4 border-ink-100">
      <div>
        <h2 className="text-lg font-semibold text-ink-950">Candidate Discovery</h2>
        <p className="text-sm text-ink-700">Filter by profile text and demonstrated skills.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search name/headline" value={query} />
        <Input
          onChange={(event) => setSkillFilter(event.target.value)}
          placeholder="Filter by skill"
          value={skillFilter}
        />
      </div>

      <div className="space-y-3">
        {filteredCandidates.length === 0 ? (
          <p className="text-sm text-ink-700">No candidates matched your filters.</p>
        ) : (
          filteredCandidates.map((candidate) => (
            <div
              className="space-y-2 rounded-xl border border-ink-100 bg-slate-50/80 p-4"
              key={candidate.userId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{candidate.name ?? "Candidate"}</p>
                  {candidate.headline ? (
                    <p className="text-sm text-ink-700">{candidate.headline}</p>
                  ) : null}
                  <p className="text-xs text-ink-500">{candidate.projectCount} projects</p>
                </div>
                <Link
                  className="text-sm font-semibold text-ink-900 underline underline-offset-2"
                  href={`/c/${candidate.userId}`}
                >
                  View
                </Link>
              </div>

              {candidate.topSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.topSkills.map((skill) => (
                    <Badge key={`${candidate.userId}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
              ) : null}

              {candidate.contactEmail ? (
                <p className="text-xs text-ink-600">Contact: {candidate.contactEmail}</p>
              ) : (
                <p className="text-xs text-ink-500">No contact email listed.</p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
