import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OpportunitiesBoard } from "@/components/opportunities/opportunities-board";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/db/profile";
import { fetchOpportunitiesForCandidate } from "@/lib/db/opportunities";

export default async function OpportunitiesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  const [profile, opportunities] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchOpportunitiesForCandidate(supabase, user.id)
  ]);

  return (
    <AppShell roleType={profile?.roleType} userEmail={user.email}>
      <section className="space-y-5">
        <Card className="space-y-2 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
          <h1 className="text-3xl font-semibold tracking-tight text-[#171512]">Opportunities</h1>
          <p className="text-sm text-[#5e574c]">
            Browse internship roles and track how your proof profile matches each opening.
          </p>
        </Card>
        <OpportunitiesBoard opportunities={opportunities} />
      </section>
    </AppShell>
  );
}
