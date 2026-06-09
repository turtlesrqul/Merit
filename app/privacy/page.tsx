import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { getViewerProfile } from "@/lib/db/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PrivacyPage() {
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
          <h1 className="text-2xl font-semibold text-ink-950">Privacy Policy</h1>
          <p className="text-sm text-ink-700">
            Merit collects account details, profile information, and project artifacts needed to run
            discovery and portfolio features.
          </p>
          <p className="text-sm text-ink-700">
            We use this data to operate the app, improve product quality, and maintain platform
            safety. We do not sell personal data.
          </p>
          <p className="text-sm text-ink-700">
            If you need data support or account assistance, contact the support channel listed in the
            app footer and auth pages.
          </p>
        </Card>
      </section>
    </AppShell>
  );
}
