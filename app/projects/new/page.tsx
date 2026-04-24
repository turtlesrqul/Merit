import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectForm } from "@/components/projects/project-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/db/profile";

export default async function NewProjectPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  const profile = await getViewerProfile(supabase, user.id);

  return (
    <AppShell roleType={profile?.roleType} userEmail={user.email}>
      <ProjectForm mode="create" />
    </AppShell>
  );
}
