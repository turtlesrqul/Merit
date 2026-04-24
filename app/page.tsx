import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS } from "@/lib/demo/accounts";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] items-center px-6 py-14">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_430px]">
        <div className="space-y-8">
          <p className="inline-flex rounded-full border border-sun-200 bg-sun-100 px-3 py-1 text-sm font-semibold uppercase tracking-[0.11em] text-ink-700">
            Proof over pedigree
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] text-ink-950 sm:text-6xl">
            Build a profile recruiters trust in one scroll.
          </h1>
          <p className="max-w-2xl text-lg text-ink-700">
            Merit is a professional network where project evidence comes first. Show
            your real work, get discovered, and match with opportunities based on outcomes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up">
              <Button className="px-6 py-3 text-base">Create account</Button>
            </Link>
            <Link href="/home">
              <Button className="px-6 py-3 text-base" variant="secondary">
                Explore feed
              </Button>
            </Link>
          </div>

          <div className="space-y-3 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-[0_6px_18px_rgba(16,24,40,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">Demo accounts</p>
            </div>
            {DEMO_ACCOUNTS.length === 0 ? (
              <p className="text-sm text-ink-700">
                Demo accounts not loaded yet. Run <code>npm run seed:demo</code> after adding your service role key.
              </p>
            ) : (
              <div className="space-y-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <div
                    className="rounded-xl border border-ink-100 bg-slate-50/80 p-3"
                    key={account.id}
                  >
                    <p className="text-sm font-semibold text-ink-900">{account.name}</p>
                    <p className="text-xs text-ink-700">{account.headline}</p>
                    <p className="mt-1 text-xs text-ink-600">
                      {account.email} / {account.password}
                    </p>
                    <p className="mt-1 text-xs text-ink-600">
                      {account.roleType === "recruiter"
                        ? `Includes ${(account.opportunities ?? []).length} seeded role postings`
                        : `Includes ${account.projects.length} seeded demo projects`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={`/sign-in?demo=${account.id}`}>
                        <Button className="px-3 py-1.5 text-xs" variant="secondary">
                          Sign in as {account.name.split(" ")[0]}
                        </Button>
                      </Link>
                      <Link href="/profile">
                        <Button className="px-3 py-1.5 text-xs" variant="ghost">
                          Open profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-ink-100 bg-white/95 p-5 shadow-[0_8px_30px_rgba(16,24,40,0.1)]">
          <div className="rounded-2xl border border-ink-100 bg-sun-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Discovery Feed</p>
            <p className="text-sm text-ink-700">See what peers actually shipped, not just resumes.</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900">Project Cards</p>
            <p className="text-sm text-ink-700">
              Rich thumbnails for websites, media, demos, and repos.
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900">Smart Matching</p>
            <p className="text-sm text-ink-700">
              Opportunities and candidates are ranked by demonstrated skill signals.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
