import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DiscoveryFeed } from "@/components/projects/discovery-feed";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserAndProfile, getViewerProfile } from "@/lib/db/profile";
import { fetchDiscoveryProjects, fetchSavedInteractionState } from "@/lib/db/projects";
import {
  fetchOpportunitiesForCandidate,
  fetchRecruiterOpportunities
} from "@/lib/db/opportunities";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const {
      data: { user: resolvedUser }
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    user = null;
  }

  const discoveryProjects = await fetchDiscoveryProjects(supabase);

  if (!user) {
    return (
      <AppShell>
        <DiscoveryFeed inspiredProjectIds={[]} projects={discoveryProjects} savedProjectIds={[]} />
      </AppShell>
    );
  }

  await ensureUserAndProfile(supabase, user);

  const [profile, interactionState] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchSavedInteractionState(supabase, user.id)
  ]);
  const isRecruiter = profile?.roleType === "recruiter";

  const [candidateOpportunities, recruiterOpportunities] = await Promise.all([
    isRecruiter ? Promise.resolve([]) : fetchOpportunitiesForCandidate(supabase, user.id),
    isRecruiter ? fetchRecruiterOpportunities(supabase, user.id) : Promise.resolve([])
  ]);
  const matchedCount = candidateOpportunities.filter((opportunity) => opportunity.matchScore !== null).length;
  const completionScore = profile?.profileCompletionScore ?? 0;

  return (
    <AppShell roleType={profile?.roleType} userEmail={user.email}>
      <section className="space-y-5">
        <DiscoveryFeed
          inspiredProjectIds={interactionState.inspiredProjectIds}
          projects={discoveryProjects}
          savedProjectIds={interactionState.savedProjectIds}
          showInteractions
        />

        {isRecruiter ? (
          <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]">
            <h3 className="text-base font-semibold text-[#171512]">Recruiter pipeline</h3>
            <p className="text-sm text-[#5e574c]">
              You have {recruiterOpportunities.length} posted role
              {recruiterOpportunities.length === 1 ? "" : "s"} and {matchedCount} current match
              {matchedCount === 1 ? "" : "es"}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/recruiter">
                <Button variant="secondary">Open recruiter dashboard</Button>
              </Link>
              <Link href="/profile">
                <Button variant="secondary">Open profile studio</Button>
              </Link>
              <Link href="/projects/new">
                <Button>Add project</Button>
              </Link>
            </div>
          </Card>
        ) : completionScore < 100 ? (
          <ProfileCompletionPrompt score={completionScore} />
        ) : null}
      </section>
    </AppShell>
  );
}
