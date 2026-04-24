import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { ProfileProjectSearch } from "@/components/profile/profile-project-search";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/db/profile";
import {
  fetchProjectsByUser,
  fetchSavedInteractionState,
  fetchSavedProjectsByUser
} from "@/lib/db/projects";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [profile, ownProjects, savedProjects, interactionState] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchProjectsByUser(supabase, user.id),
    fetchSavedProjectsByUser(supabase, user.id),
    fetchSavedInteractionState(supabase, user.id)
  ]);
  const resolvedProfile = profile ?? {
    userId: user.id,
    email: user.email ?? "",
    name: user.email?.split("@")[0] ?? "Merit User",
    headline: "",
    roleType: "candidate" as const,
    targetRoles: [] as string[],
    bio: "",
    contactEmail: user.email ?? "",
    portfolioLinks: [] as string[],
    profileCompletionScore: 0
  };

  const targetRolesValue = Array.isArray(resolvedProfile.targetRoles)
    ? resolvedProfile.targetRoles.join(", ")
    : "";
  const portfolioLinksValue = Array.isArray(resolvedProfile.portfolioLinks)
    ? resolvedProfile.portfolioLinks.join("\n")
    : "";

  return (
    <AppShell roleType={resolvedProfile.roleType} userEmail={user.email}>
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <EditProfileForm
            initialValues={{
              name: resolvedProfile.name ?? "",
              roleType: resolvedProfile.roleType === "recruiter" ? "recruiter" : "candidate",
              headline: resolvedProfile.headline ?? "",
              bio: resolvedProfile.bio ?? "",
              contactEmail: resolvedProfile.contactEmail ?? resolvedProfile.email,
              targetRoles: targetRolesValue,
              portfolioLinks: portfolioLinksValue
            }}
            userId={resolvedProfile.userId}
          />

          <Card className="h-fit space-y-3 border-sun-200 bg-gradient-to-b from-sun-50 to-white">
            <h3 className="text-base font-semibold text-ink-950">Profile completion</h3>
            <p className="text-4xl font-semibold text-ink-950">{resolvedProfile.profileCompletionScore}%</p>
            <p className="text-sm text-ink-700">
              Completion score is based on identity, contact, role, and evidence fields.
            </p>
            <div className="pt-1">
              <Link href={`/c/${resolvedProfile.userId}`}>
                <Button className="w-full" variant="secondary">
                  View Passport
                </Button>
              </Link>
            </div>
            {resolvedProfile.roleType === "recruiter" ? (
              <Link href="/recruiter">
                <Button className="w-full" variant="secondary">
                  Open recruiter dashboard
                </Button>
              </Link>
            ) : null}
          </Card>
        </div>

        <ProfileProjectSearch
          inspiredProjectIds={interactionState.inspiredProjectIds}
          ownProjects={ownProjects}
          savedProjectIds={interactionState.savedProjectIds}
          savedProjects={savedProjects}
        />
      </section>
    </AppShell>
  );
}
