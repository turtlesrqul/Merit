"use client";

import { useMemo, useState } from "react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OpportunityRecord } from "@/lib/db/opportunities";

type OpportunitiesBoardProps = {
  opportunities: OpportunityRecord[];
};

export function OpportunitiesBoard({ opportunities }: OpportunitiesBoardProps) {
  const [query, setQuery] = useState("");
  const [onlyMatched, setOnlyMatched] = useState(false);
  const matchedCount = useMemo(
    () => opportunities.filter((opportunity) => opportunity.matchScore !== null).length,
    [opportunities]
  );

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return opportunities
      .filter((opportunity) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [opportunity.title, opportunity.company, opportunity.description, opportunity.skillsSought.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        const matchesState = !onlyMatched || opportunity.matchScore !== null;
        return matchesQuery && matchesState;
      })
      .sort((a, b) => {
        const aScore = a.matchScore ?? -1;
        const bScore = b.matchScore ?? -1;
        return bScore - aScore;
      });
  }, [opportunities, query, onlyMatched]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, company, skill"
            value={query}
          />
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#e2d8c8] bg-[#f6efdf] px-3 py-2 text-sm text-[#5e574c]">
            <input checked={onlyMatched} onChange={(event) => setOnlyMatched(event.target.checked)} type="checkbox" />
            Show matched only
          </label>
        </div>
        <p className="text-sm text-[#6b6356]">
          {visibleOpportunities.length} opportunity{visibleOpportunities.length === 1 ? "" : "ies"} shown,{" "}
          {matchedCount} matched
        </p>
      </Card>

      {visibleOpportunities.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">No opportunities match your filter right now.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.opportunityId} mode="candidate" opportunity={opportunity} />
          ))}
        </div>
      )}
    </div>
  );
}
