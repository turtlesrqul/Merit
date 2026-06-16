import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PassportAdminStudio } from "@/components/admin/passport-admin-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildClaimPassportUrl, resolveClaimLinkBaseUrl } from "@/lib/auth/claim-links";
import { resolveSafeAuthNext } from "@/lib/auth/auth-urls";
import { listClaimablePassports } from "@/lib/db/claimable-passports";
import { getPublicAppUrl } from "@/lib/public-config";
import { isAdminEmail } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminPassportsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(resolveSafeAuthNext("/admin/passports"))}`);
  }

  if (!isAdminEmail(user.email)) {
    return (
      <AppShell userEmail={user.email}>
        <section className="editorial-container pt-10">
          <Card className="max-w-2xl space-y-4">
            <p className="label-caps">Unauthorized</p>
            <h1 className="font-serif text-3xl text-[#16130f]">Admin access required</h1>
            <p className="text-sm leading-6 text-[#7b705f]">
              This Passport creation area is limited to approved admin/dev accounts.
            </p>
            <Link href="/home">
              <Button variant="secondary">Go to Explore</Button>
            </Link>
          </Card>
        </section>
      </AppShell>
    );
  }

  const passports = await listClaimablePassports();
  const headerStore = await headers();
  const claimLinkBaseUrl = resolveClaimLinkBaseUrl({
    fallbackSiteUrl: getPublicAppUrl(),
    fallbackViteSiteUrl: process.env.VITE_SITE_URL,
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
    origin: headerStore.get("origin"),
    referer: headerStore.get("referer")
  });
  const passportsWithClaimLinks = passports.map(({ claimToken, ...passport }) => ({
    ...passport,
    claimLink: claimToken ? buildClaimPassportUrl(claimToken, claimLinkBaseUrl) : null
  }));

  return (
    <AppShell userEmail={user.email}>
      <PassportAdminStudio passports={passportsWithClaimLinks} />
    </AppShell>
  );
}
