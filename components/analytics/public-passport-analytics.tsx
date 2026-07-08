"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackMeritEvent } from "@/lib/analytics/client";

type PublicPassportAnalyticsProps = {
  featuredProjectId: string | null;
  isOwner: boolean;
  ownerId: string | null;
  passportId: string;
  passportSlug: string | null;
  profileCompletionPercentage?: number | null;
  projectCount: number;
  viewerSignedIn: boolean;
};

type PublicPassportCtaProps = {
  ownerId: string | null;
  passportId: string;
  passportSlug: string | null;
  placement: "top" | "bottom";
};

const SIGNUP_HREF = "/sign-up?next=%2Fprofile";

export function PublicPassportAnalytics({
  featuredProjectId,
  isOwner,
  ownerId,
  passportId,
  passportSlug,
  profileCompletionPercentage,
  projectCount,
  viewerSignedIn
}: PublicPassportAnalyticsProps) {
  useEffect(() => {
    const baseProperties = {
      featured_project_id: featuredProjectId,
      isLoggedIn: viewerSignedIn,
      isOwner,
      ownerId,
      passportId,
      passport_slug: passportSlug,
      profileCompletionPercentage: profileCompletionPercentage ?? null,
      project_count: projectCount,
      timestamp: new Date().toISOString()
    };

    trackMeritEvent("passport_viewed", baseProperties, {
      dedupeKey: `passport_viewed:${passportId}`,
      dedupeWindowMs: 60_000
    });
  }, [
    featuredProjectId,
    isOwner,
    ownerId,
    passportId,
    passportSlug,
    profileCompletionPercentage,
    projectCount,
    viewerSignedIn
  ]);

  return null;
}

export function PublicPassportCta({
  ownerId,
  passportId,
  passportSlug,
  placement
}: PublicPassportCtaProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#d7cebd] bg-[#fbf8f0] px-4 py-3 sm:px-5">
      <p className="text-sm leading-6 text-[#4b4439]">
        <span className="font-semibold text-[#16130f]">Make your own Merit Passport today.</span>{" "}
        Build a portfolio around proof of work.
      </p>
      <Link
        className="inline-flex items-center justify-center border border-[#16130f] px-4 py-2 text-sm font-semibold text-[#16130f] transition hover:bg-[#16130f] hover:text-[#fbf8f0]"
        href={SIGNUP_HREF}
        onClick={() =>
          trackMeritEvent("public_passport_cta_clicked", {
            passport_slug: passportSlug,
            ownerId,
            passportId,
            placement
          })
        }
      >
        Start yours
      </Link>
    </div>
  );
}
