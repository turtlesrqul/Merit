import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProfileStudio } from "@/components/profile/profile-studio";
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
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const {
      data: { user: resolvedUser }
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <AppShell>
        <section className="space-y-6">
          <Card className="space-y-3 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
            <h1 className="text-3xl font-semibold tracking-tight text-[#171512]">Profile</h1>
            <p className="text-sm text-[#5e574c]">
              You are browsing as a guest. Sign in to create and manage your profile.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/sign-in">
                <Button variant="secondary">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Create account</Button>
              </Link>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-[#5e574c]">
              Your profile is empty until you log in. After sign-in, you can add your info and publish projects.
            </p>
          </Card>
        </section>
      </AppShell>
    );
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

  return (
    <AppShell roleType={resolvedProfile.roleType} userEmail={user.email}>
      <ProfileStudio
        initialProfile={{
          name: resolvedProfile.name ?? "",
          roleType: resolvedProfile.roleType === "recruiter" ? "recruiter" : "candidate",
          headline: resolvedProfile.headline ?? "",
          bio: resolvedProfile.bio ?? "",
          contactEmail: resolvedProfile.contactEmail ?? resolvedProfile.email,
          targetRoles: Array.isArray(resolvedProfile.targetRoles) ? resolvedProfile.targetRoles : [],
          portfolioLinks: Array.isArray(resolvedProfile.portfolioLinks)
            ? resolvedProfile.portfolioLinks
            : [],
          profileCompletionScore: resolvedProfile.profileCompletionScore
        }}
        inspiredProjectIds={interactionState.inspiredProjectIds}
        ownProjects={ownProjects}
        savedProjectIds={interactionState.savedProjectIds}
        savedProjects={savedProjects}
        userId={resolvedProfile.userId}
      />
    </AppShell>
  );
}
