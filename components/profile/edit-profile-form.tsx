"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EditProfileFormProps = {
  userId: string;
  initialValues: {
    name: string;
    roleType: "candidate" | "recruiter";
    headline: string;
    bio: string;
    contactEmail: string;
    targetRoles: string;
    portfolioLinks: string;
  };
};

type BrowserClient = ReturnType<typeof createBrowserSupabaseClient>;

function parseCommaSeparatedInput(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLineSeparatedInput(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function EditProfileForm({ userId, initialValues }: EditProfileFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [roleType, setRoleType] = useState<"candidate" | "recruiter">(initialValues.roleType);
  const [headline, setHeadline] = useState(initialValues.headline);
  const [bio, setBio] = useState(initialValues.bio);
  const [contactEmail, setContactEmail] = useState(initialValues.contactEmail);
  const [targetRoles, setTargetRoles] = useState(initialValues.targetRoles);
  const [portfolioLinks, setPortfolioLinks] = useState(initialValues.portfolioLinks);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const previewScore = useMemo(
    () =>
      calculateProfileCompletionScore({
        name,
        headline,
        bio,
        contactEmail,
        targetRoles: parseCommaSeparatedInput(targetRoles),
        portfolioLinks: parseLineSeparatedInput(portfolioLinks)
      }),
    [name, headline, bio, contactEmail, targetRoles, portfolioLinks]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedTargetRoles = parseCommaSeparatedInput(targetRoles);
    const parsedPortfolioLinks = parseLineSeparatedInput(portfolioLinks);
    const profileCompletionScore = calculateProfileCompletionScore({
      name,
      headline,
      bio,
      contactEmail,
      targetRoles: parsedTargetRoles,
      portfolioLinks: parsedPortfolioLinks
    });

    const supabase: BrowserClient = createBrowserSupabaseClient();
    const usersResult = await supabase
      .from("users")
      .update({
        name,
        role_type: roleType,
        headline,
        target_roles: parsedTargetRoles
      })
      .eq("user_id", userId);

    if (usersResult.error) {
      setErrorMessage(usersResult.error.message);
      setIsSaving(false);
      return;
    }

    const profileResult = await supabase.from("candidate_profiles").upsert(
      {
        user_id: userId,
        bio,
        contact_email: contactEmail,
        portfolio_links: parsedPortfolioLinks,
        profile_completion_score: profileCompletionScore
      },
      { onConflict: "user_id" }
    );

    if (profileResult.error) {
      setErrorMessage(profileResult.error.message);
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Profile updated.");
    setIsSaving(false);
  };

  return (
    <Card className="space-y-6 border-ink-100">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-ink-950">Edit profile</h2>
        <p className="text-sm text-ink-700">
          Completion preview: <strong>{previewScore}%</strong>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm text-ink-900">
          Full name
          <Input onChange={(event) => setName(event.target.value)} required value={name} />
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          Account mode
          <select
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white focus:border-sun-400 focus:ring-4 focus:ring-sun-100"
            onChange={(event) => setRoleType(event.target.value as "candidate" | "recruiter")}
            value={roleType}
          >
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          Headline
          <Input
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Product-minded software builder"
            value={headline}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          About
          <Textarea
            onChange={(event) => setBio(event.target.value)}
            placeholder="What problems do you like solving?"
            value={bio}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          Contact email
          <Input
            onChange={(event) => setContactEmail(event.target.value)}
            type="email"
            value={contactEmail}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          Target roles (comma separated)
          <Input
            onChange={(event) => setTargetRoles(event.target.value)}
            placeholder="Frontend Intern, Product Analyst Intern"
            value={targetRoles}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink-900">
          Portfolio links (one URL per line)
          <Textarea
            onChange={(event) => setPortfolioLinks(event.target.value)}
            placeholder="https://github.com/username/project"
            value={portfolioLinks}
          />
        </label>

        {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
