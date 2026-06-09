"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";

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

type OpportunityFormProps = {
  onCreated?: (opportunityId: string) => Promise<void> | void;
};

export function OpportunityForm({ onCreated }: OpportunityFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skillsSought, setSkillsSought] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const { supabase, user } = await requireVerifiedBrowserUser("posting opportunities");

      const parsedSkills = parseSkills(skillsSought);
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          recruiter_id: user.id,
          title,
          company,
          description,
          skills_sought: parsedSkills
        })
        .select("opportunity_id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const opportunityId = (data as Record<string, unknown>).opportunity_id;
      if (typeof opportunityId === "string" && onCreated) {
        await onCreated(opportunityId);
      }

      setSuccessMessage("Opportunity posted.");
      setTitle("");
      setCompany("");
      setDescription("");
      setSkillsSought("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to post opportunity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="space-y-4 border-sun-200">
      <div>
        <h2 className="text-lg font-semibold text-ink-950">Post Internship Role</h2>
        <p className="text-sm text-ink-700">
          Add role requirements so the match engine can recommend candidates.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
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
            className="min-h-[120px]"
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

        {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Posting..." : "Post opportunity"}
        </Button>
      </form>
    </Card>
  );
}
