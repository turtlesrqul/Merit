"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { MatchEngineControls } from "@/components/recruiter/match-engine-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type {
  RecruiterMatchedCandidate,
  RecruiterOpportunity
} from "@/lib/db/opportunities";

type EditableOpportunityCardProps = {
  opportunity: RecruiterOpportunity;
  matchedCandidates: RecruiterMatchedCandidate[];
  onUpdated?: (opportunityId: string) => Promise<void> | void;
};

function parseSkills(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function EditableOpportunityCard({
  opportunity,
  matchedCandidates,
  onUpdated
}: EditableOpportunityCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(opportunity.title);
  const [company, setCompany] = useState(opportunity.company);
  const [description, setDescription] = useState(opportunity.description);
  const [skillsSought, setSkillsSought] = useState(opportunity.skillsSought.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetToOriginal = () => {
    setTitle(opportunity.title);
    setCompany(opportunity.company);
    setDescription(opportunity.description);
    setSkillsSought(opportunity.skillsSought.join(", "));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const parsedSkills = parseSkills(skillsSought);
      const { error } = await supabase
        .from("opportunities")
        .update({
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
          skills_sought: parsedSkills
        })
        .eq("opportunity_id", opportunity.opportunityId);

      if (error) {
        throw new Error(error.message);
      }

      if (onUpdated) {
        await onUpdated(opportunity.opportunityId);
      }

      setIsEditing(false);
      setSuccessMessage("Opportunity updated.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update opportunity.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm(
      "Delete this opportunity? This will also remove related matches."
    );
    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeleting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("opportunity_id", opportunity.opportunityId);

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage("Opportunity deleted.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete opportunity.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="space-y-3 border-ink-100">
      <OpportunityCard mode="recruiter" opportunity={opportunity} />

      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
        {isEditing ? (
          <>
            <Button
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false);
                resetToOriginal();
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} form={`opp-edit-${opportunity.opportunityId}`} type="submit">
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={isDeleting} onClick={() => setIsEditing(true)} type="button" variant="secondary">
              Edit
            </Button>
            <Button disabled={isDeleting} onClick={handleDelete} type="button" variant="secondary">
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        )}
      </div>

      {isEditing ? (
        <form className="space-y-3 rounded-xl border border-sun-200 bg-sun-50/40 p-3" id={`opp-edit-${opportunity.opportunityId}`} onSubmit={handleSave}>
          <label className="block space-y-2 text-sm text-ink-900">
            Role title
            <Input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Company
            <Input onChange={(event) => setCompany(event.target.value)} required value={company} />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Description
            <Textarea
              className="min-h-[100px]"
              onChange={(event) => setDescription(event.target.value)}
              required
              value={description}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Skills sought (comma separated)
            <Input
              onChange={(event) => setSkillsSought(event.target.value)}
              placeholder="react, sql, product thinking"
              value={skillsSought}
            />
          </label>
        </form>
      ) : null}

      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <MatchEngineControls compact opportunityId={opportunity.opportunityId} />
      <div className="space-y-2 border-t border-ink-100 pt-3">
        <p className="text-sm font-semibold text-ink-900">Matched candidates</p>
        {matchedCandidates.length === 0 ? (
          <p className="text-sm text-ink-600">
            No matches yet. Run the match engine for this role.
          </p>
        ) : (
          matchedCandidates.slice(0, 5).map((match) => (
            <div
              className="rounded-xl border border-ink-100 bg-slate-50 p-3"
              key={`${match.opportunityId}-${match.userId}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{match.name ?? "Candidate"}</p>
                  {match.headline ? <p className="text-xs text-ink-600">{match.headline}</p> : null}
                </div>
                <span className="text-xs font-semibold text-ink-700">{match.matchScore}%</span>
              </div>
              {match.contactEmail ? (
                <p className="mt-1 text-xs text-ink-600">Contact: {match.contactEmail}</p>
              ) : (
                <p className="mt-1 text-xs text-ink-500">No contact email listed.</p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
