import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { getViewerProfile } from "@/lib/db/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TermsPage() {
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

  const viewerProfile = user ? await getViewerProfile(supabase, user.id) : null;

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <Card className="space-y-3 border-sun-200">
          <h1 className="text-2xl font-semibold text-ink-950">Terms of Service</h1>
          <p className="text-sm text-ink-700">
            Merit is a beta platform for showcasing project proof. You are responsible for content
            you publish and for ensuring you have rights to uploaded materials.
          </p>
          <p className="text-sm text-ink-700">
            Do not upload unlawful, abusive, or infringing content. We may remove content or suspend
            accounts that violate platform rules.
          </p>
          <p className="text-sm text-ink-700">
            Merit is provided as-is during beta and may change rapidly as we improve reliability and
            safety.
          </p>
        </Card>
      </section>
    </AppShell>
  );
}
