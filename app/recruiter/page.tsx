import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecruiterDashboard } from "@/components/recruiter/recruiter-dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/db/profile";
import {
  fetchCandidateDirectory,
  fetchRecruiterMatchedCandidates,
  fetchRecruiterOpportunities
} from "@/lib/db/opportunities";

export default async function RecruiterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  const profile = await getViewerProfile(supabase, user.id);
  const roleType = profile?.roleType ?? "candidate";

  if (roleType !== "recruiter") {
    return (
      <AppShell roleType={roleType} userEmail={user.email}>
        <Card className="mx-auto mt-8 max-w-2xl space-y-4 border-sun-200">
          <h1 className="text-2xl font-semibold text-ink-950">Recruiter mode required</h1>
          <p className="text-sm text-ink-700">
            Enable recruiter mode in your profile settings to access candidate discovery and role
            posting.
          </p>
          <div className="pt-1">
            <Link href="/profile">
              <Button>Open profile settings</Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  const [opportunities, candidates, matchedCandidates] = await Promise.all([
    fetchRecruiterOpportunities(supabase, user.id),
    fetchCandidateDirectory(supabase, user.id),
    fetchRecruiterMatchedCandidates(supabase, user.id)
  ]);

  return (
    <AppShell roleType={roleType} userEmail={user.email}>
      <RecruiterDashboard
        candidates={candidates}
        matchedCandidates={matchedCandidates}
        opportunities={opportunities}
      />
    </AppShell>
  );
}
