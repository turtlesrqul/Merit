import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CareerCoachPanel } from "@/components/coach/career-coach-panel";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import { DiscoveryFeed } from "@/components/projects/discovery-feed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserAndProfile, getViewerProfile } from "@/lib/db/profile";
import { fetchDiscoveryProjects, fetchProjectsByUser, fetchSavedInteractionState } from "@/lib/db/projects";
import {
  fetchOpportunitiesForCandidate,
  fetchRecruiterOpportunities
} from "@/lib/db/opportunities";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  await ensureUserAndProfile(supabase, user);

  const [profile, discoveryProjects, interactionState, ownProjects] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchDiscoveryProjects(supabase),
    fetchSavedInteractionState(supabase, user.id),
    fetchProjectsByUser(supabase, user.id)
  ]);
  const isRecruiter = profile?.roleType === "recruiter";

  const [candidateOpportunities, recruiterOpportunities] = await Promise.all([
    isRecruiter ? Promise.resolve([]) : fetchOpportunitiesForCandidate(supabase, user.id),
    isRecruiter ? fetchRecruiterOpportunities(supabase, user.id) : Promise.resolve([])
  ]);

  const matchedCount = candidateOpportunities.filter((opportunity) => opportunity.matchScore !== null).length;

  return (
    <AppShell roleType={profile?.roleType} userEmail={user.email}>
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <Card className="space-y-3 border-sun-200">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-600">My profile</p>
            <div>
              <p className="text-lg font-semibold text-ink-950">{profile?.name ?? "Member"}</p>
              <p className="text-sm text-ink-700">{profile?.headline || "Add a headline to stand out."}</p>
            </div>
            <div className="space-y-1 text-sm text-ink-700">
              <p>{ownProjects.length} project{ownProjects.length === 1 ? "" : "s"} published</p>
              <p>{matchedCount} opportunity match{matchedCount === 1 ? "" : "es"}</p>
            </div>
            <div className="pt-1">
              <Link href="/profile">
                <Button className="w-full" variant="secondary">
                  Edit profile
                </Button>
              </Link>
            </div>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-ink-900">Quick links</p>
            <Link className="block text-sm text-ink-700 underline decoration-sun-300 underline-offset-4" href="/people">
              Browse all profiles
            </Link>
            <Link className="block text-sm text-ink-700 underline decoration-sun-300 underline-offset-4" href="/projects/new">
              Add new project
            </Link>
            <Link className="block text-sm text-ink-700 underline decoration-sun-300 underline-offset-4" href="/opportunities">
              Open opportunities
            </Link>
          </Card>
        </aside>

        <DiscoveryFeed
          inspiredProjectIds={interactionState.inspiredProjectIds}
          projects={discoveryProjects}
          savedProjectIds={interactionState.savedProjectIds}
        />

        <aside className="space-y-4">
          <ProfileCompletionPrompt score={profile?.profileCompletionScore ?? 0} />
          {isRecruiter ? (
            <>
              <Card className="space-y-3">
                <h3 className="text-base font-semibold text-ink-950">Recruiter pipeline</h3>
                <p className="text-sm text-ink-700">
                  You have {recruiterOpportunities.length} posted role
                  {recruiterOpportunities.length === 1 ? "" : "s"}.
                </p>
                <div className="pt-1">
                  <Link href="/recruiter">
                    <Button className="w-full" variant="secondary">
                      Open recruiter dashboard
                    </Button>
                  </Link>
                </div>
              </Card>
              <Card className="space-y-2">
                <h3 className="text-base font-semibold text-ink-950">Matching status</h3>
                <p className="text-sm text-ink-700">
                  Run the match engine after posting or updating role requirements.
                </p>
              </Card>
            </>
          ) : (
            <>
              <CareerCoachPanel
                profile={{
                  headline: profile?.headline ?? "",
                  targetRoles: profile?.targetRoles ?? [],
                  bio: profile?.bio ?? ""
                }}
                projects={ownProjects.map((project) => ({
                  title: project.title,
                  category: project.category,
                  skills: project.skills,
                  impact: project.impact,
                  artifactCount: project.artifacts.length
                }))}
              />
              <Card className="space-y-3">
                <h3 className="text-base font-semibold text-ink-950">Match insights</h3>
                <p className="text-sm text-ink-700">
                  You currently have {matchedCount} matched opportunit
                  {matchedCount === 1 ? "y" : "ies"}.
                </p>
                <div className="pt-1">
                  <Link href="/opportunities">
                    <Button className="w-full" variant="secondary">
                      View opportunities
                    </Button>
                  </Link>
                </div>
              </Card>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
