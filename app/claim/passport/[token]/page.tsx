import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClaimPassportPanel } from "@/components/passports/claim-passport-panel";
import { ClaimablePassportPreview } from "@/components/passports/claimable-passport-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildAuthPath } from "@/lib/auth/auth-urls";
import { fetchClaimablePassportByToken } from "@/lib/db/claimable-passports";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClaimPassportPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    claim_error?: string | string[];
  }>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getClaimedPassportPath(passport: NonNullable<Awaited<ReturnType<typeof fetchClaimablePassportByToken>>["passport"]>) {
  if (passport.passportSlug) {
    return `/passport/${passport.passportSlug}`;
  }
  return passport.ownerUserId ? `/c/${passport.ownerUserId}` : "/home";
}

export default async function ClaimPassportPage({ params, searchParams }: ClaimPassportPageProps) {
  const [{ token }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const claimErrorMessage = getSingleSearchParam(resolvedSearchParams?.claim_error);
  const lookup = await fetchClaimablePassportByToken(token);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (lookup.state === "claimed" && lookup.passport) {
    if (user && lookup.passport.ownerUserId === user.id) {
      redirect(getClaimedPassportPath(lookup.passport));
    }

    return (
      <AppShell userEmail={user?.email}>
        <section className="editorial-container pt-10">
          <Card className="max-w-2xl space-y-4">
            <p className="label-caps">Claim link</p>
            <h1 className="font-serif text-3xl text-[#16130f]">This passport has already been claimed.</h1>
            <p className="text-sm leading-6 text-[#7b705f]">
              Check your dashboard or passport page to view your passport.
            </p>
            <Link href={user ? "/home" : buildAuthPath("/sign-in", "/home")}>
              <Button>Go to dashboard</Button>
            </Link>
          </Card>
        </section>
      </AppShell>
    );
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
            {claimErrorMessage ? (
              <p className="border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700" role="alert">
                {claimErrorMessage}
              </p>
            ) : null}
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
              {claimErrorMessage ? (
                <p className="border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700" role="alert">
                  {claimErrorMessage}
                </p>
              ) : null}
              <p className="label-caps">Expired</p>
              <h2 className="font-serif text-2xl text-[#16130f]">This Passport claim link has expired</h2>
              <p className="text-sm leading-6 text-[#7b705f]">
                The Passport preview is still here, but claiming is disabled until an admin regenerates the link.
              </p>
            </>
          ) : user ? (
            <ClaimPassportPanel initialErrorMessage={claimErrorMessage} token={token} />
          ) : (
            <>
              {claimErrorMessage ? (
                <p className="border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700" role="alert">
                  {claimErrorMessage}
                </p>
              ) : null}
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
