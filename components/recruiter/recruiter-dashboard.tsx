"use client";

import { EditableOpportunityCard } from "@/components/recruiter/editable-opportunity-card";
import { OpportunityForm } from "@/components/recruiter/opportunity-form";
import { MatchEngineControls } from "@/components/recruiter/match-engine-controls";
import { CandidateExplorer } from "@/components/recruiter/candidate-explorer";
import { Card } from "@/components/ui/card";
import type {
  CandidateDirectoryItem,
  RecruiterMatchedCandidate,
  RecruiterOpportunity
} from "@/lib/db/opportunities";

type RecruiterDashboardProps = {
  opportunities: RecruiterOpportunity[];
  candidates: CandidateDirectoryItem[];
  matchedCandidates: RecruiterMatchedCandidate[];
};

export function RecruiterDashboard({
  opportunities,
  candidates,
  matchedCandidates
}: RecruiterDashboardProps) {
  const runForNewOpportunity = async (opportunityId: string) => {
    await fetch("/api/matches/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ opportunityId })
    });
  };

  return (
    <section className="space-y-6">
      <Card className="space-y-3 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
        <h1 className="text-3xl font-semibold tracking-tight text-[#171512]">Recruiter Dashboard</h1>
        <p className="text-sm text-[#5e574c]">
          Post roles, discover candidate proof profiles, and run the rules-based match engine.
        </p>
        <MatchEngineControls />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <OpportunityForm onCreated={runForNewOpportunity} />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink-950">Posted opportunities</h2>
          {opportunities.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">No roles posted yet.</p>
            </Card>
          ) : (
            opportunities.map((opportunity) => (
              <EditableOpportunityCard
                key={opportunity.opportunityId}
                matchedCandidates={matchedCandidates.filter(
                  (match) => match.opportunityId === opportunity.opportunityId
                )}
                onUpdated={runForNewOpportunity}
                opportunity={opportunity}
              />
            ))
          )}
        </div>
      </div>

      <CandidateExplorer candidates={candidates} />
    </section>
  );
}
