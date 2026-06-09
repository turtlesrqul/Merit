import { Card } from "@/components/ui/card";

export function SupabaseSetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[920px] items-center px-5 py-10">
      <Card className="w-full space-y-5 border-sun-200">
        <div className="space-y-2">
          <p className="inline-flex rounded-full border border-sun-200 bg-sun-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-700">
            Setup Required
          </p>
          <h1 className="text-3xl font-semibold text-ink-950">Connect Supabase for Merit V2</h1>
          <p className="text-sm text-ink-700">
            This environment is missing Supabase credentials. Add the required env vars, then refresh.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-ink-100 bg-slate-50 p-4 text-sm text-ink-800">
          <p className="font-semibold text-ink-900">Required environment variables</p>
          <p>`NEXT_PUBLIC_SUPABASE_URL`</p>
          <p>`NEXT_PUBLIC_SUPABASE_ANON_KEY`</p>
          <p>`SUPABASE_SERVICE_ROLE_KEY` (required for artifact uploads)</p>
          <p>`NEXT_PUBLIC_SUPABASE_ARTIFACT_BUCKET` (optional, defaults to `project-artifacts`)</p>
          <p>`NEXT_PUBLIC_APP_URL` (recommended for auth email callback links)</p>
        </div>

        <p className="text-xs text-ink-600">
          After adding env vars in local and Vercel (Development, Preview, Production), redeploy or restart
          your dev server.
        </p>
      </Card>
    </main>
  );
}
