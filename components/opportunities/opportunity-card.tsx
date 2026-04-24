import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { OpportunityRecord, RecruiterOpportunity } from "@/lib/db/opportunities";

type CandidateOpportunityCardProps = {
  mode: "candidate";
  opportunity: OpportunityRecord;
};

type RecruiterOpportunityCardProps = {
  mode: "recruiter";
  opportunity: RecruiterOpportunity;
};

type OpportunityCardProps = CandidateOpportunityCardProps | RecruiterOpportunityCardProps;

function renderSkills(skills: string[]) {
  if (skills.length === 0) {
    return <p className="text-sm text-ink-600">No explicit skills listed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <Badge key={skill}>{skill}</Badge>
      ))}
    </div>
  );
}

export function OpportunityCard(props: OpportunityCardProps) {
  const common = props.opportunity;
  return (
    <Card className="space-y-4 border-ink-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-ink-950">{common.title}</h3>
          <p className="text-sm text-ink-700">{common.company}</p>
          <p className="mt-1 text-xs text-ink-500">
            Posted {new Date(common.createdAt).toLocaleDateString()}
          </p>
        </div>
        {props.mode === "candidate" && props.opportunity.matchScore !== null ? (
          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
            Match {props.opportunity.matchScore}%
          </Badge>
        ) : null}
        {props.mode === "recruiter" ? (
          <Badge className="border border-sun-300 bg-sun-100 text-ink-800">
            {props.opportunity.matchCount} match{props.opportunity.matchCount === 1 ? "" : "es"}
          </Badge>
        ) : null}
      </div>

      <p className="text-sm text-ink-700">{common.description}</p>
      {renderSkills(common.skillsSought)}

      {props.mode === "candidate" ? (
        <div className="space-y-1 rounded-xl border border-ink-100 bg-slate-50/60 p-3">
          <p className="text-sm text-ink-700">
            Recruiter:{" "}
            <span className="font-medium text-ink-900">
              {props.opportunity.recruiterName ?? "Merit Recruiter"}
            </span>
          </p>
          {props.opportunity.matchRationale.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {props.opportunity.matchRationale.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
