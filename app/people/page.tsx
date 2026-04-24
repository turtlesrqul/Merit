import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PeopleDirectory } from "@/components/profile/people-directory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchDirectoryMembers, getViewerProfile } from "@/lib/db/profile";

export default async function PeoplePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [viewerProfile, members] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchDirectoryMembers(supabase)
  ]);

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user.email}>
      <PeopleDirectory members={members} />
    </AppShell>
  );
}
