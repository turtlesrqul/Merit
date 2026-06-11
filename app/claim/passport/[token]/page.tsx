import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClaimablePassportPreview } from "@/components/passports/claimable-passport-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { claimPassportAction } from "@/app/claim/passport/[token]/actions";
import { buildAuthPath } from "@/lib/auth/auth-urls";
import { fetchClaimablePassportByToken } from "@/lib/db/claimable-passports";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClaimPassportPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ClaimPassportPage({ params }: ClaimPassportPageProps) {
  const { token } = await params;
  const lookup = await fetchClaimablePassportByToken(token);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (lookup.state === "claimed" && lookup.passport?.ownerUserId) {
    if (lookup.passport.passportSlug) {
      redirect(`/passport/${lookup.passport.passportSlug}`);
    }
    redirect(`/c/${lookup.passport.ownerUserId}`);
  }

  const nextPath = `/claim/passport/${token}`;

  if (!lookup.passport || lookup.state === "invalid") {
    return (
      <AppShell userEmail={user?.email}>
        <section className="editorial-container pt-10">
          <Card className="max-w-2xl space-y-4">
            <p className="label-caps">Claim link</p>
            <h1 className="font-serif text-3xl text-[#16130f]">This claim link is invalid</h1>
            <p className="text-sm leading-6 text-[#7b705f]">
              Ask the Merit admin who sent it to generate a fresh claim link.
            </p>
          </Card>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell userEmail={user?.email}>
      <ClaimablePassportPreview passport={lookup.passport} />
      <section className="editorial-container pt-8">
        <Card className="space-y-4">
          {lookup.state === "expired" ? (
            <>
              <p className="label-caps">Expired</p>
              <h2 className="font-serif text-2xl text-[#16130f]">This Passport claim link has expired</h2>
              <p className="text-sm leading-6 text-[#7b705f]">
                The Passport preview is still here, but claiming is disabled until an admin regenerates the link.
              </p>
            </>
          ) : user ? (
            <>
              <p className="label-caps">Ready to claim</p>
              <h2 className="font-serif text-2xl text-[#16130f]">Add this Passport to your Merit account</h2>
              <form action={claimPassportAction}>
                <input name="token" type="hidden" value={token} />
                <Button type="submit">Claim this Passport</Button>
              </form>
            </>
          ) : (
            <>
              <p className="label-caps">Sign in required</p>
              <h2 className="font-serif text-2xl text-[#16130f]">Sign in or create an account to claim this Passport</h2>
              <div className="flex flex-wrap gap-3">
                <Link href={buildAuthPath("/sign-in", nextPath)}>
                  <Button>Sign in to claim</Button>
                </Link>
                <Link href={buildAuthPath("/sign-up", nextPath)}>
                  <Button variant="secondary">Create account</Button>
                </Link>
              </div>
            </>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
