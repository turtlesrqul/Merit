import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import { DiscoveryFeed } from "@/components/projects/discovery-feed";
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
        <section className="space-y-5">
          <Card className="space-y-3 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6455]">Guest mode</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#171512]">Discover proof-of-work without signing in</h1>
            <p className="text-sm text-[#5b5448]">
              Browse builders, open projects, and explore passports now. Sign in when you want to save or like.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/sign-in">
                <Button variant="secondary">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Create account</Button>
              </Link>
            </div>
          </Card>

          <DiscoveryFeed inspiredProjectIds={[]} projects={discoveryProjects} savedProjectIds={[]} />
        </section>
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
