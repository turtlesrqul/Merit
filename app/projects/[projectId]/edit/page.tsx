import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectForm } from "@/components/projects/project-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/db/profile";
import { fetchProjectFormData } from "@/lib/db/projects";

type EditProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const profile = await getViewerProfile(supabase, user.id);
  const project = await fetchProjectFormData(supabase, projectId, user.id);

  if (!project) {
    notFound();
  }

  return (
    <AppShell roleType={profile?.roleType} userEmail={user.email}>
      <ProjectForm
        initialData={{
          projectId: project.projectId,
          title: project.title,
          problemSolved: project.problemSolved,
          whatWasBuilt: project.whatWasBuilt,
          category: project.category,
          impact: project.impact,
          skills: project.skills,
          artifactLinks: project.artifactLinks
        }}
        mode="edit"
      />
    </AppShell>
  );
}
