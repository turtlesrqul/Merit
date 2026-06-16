"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackMeritEvent } from "@/lib/analytics/client";

type PublicPassportAnalyticsProps = {
  featuredProjectId: string | null;
  passportSlug: string | null;
  passportUserId: string;
  projectCount: number;
  viewerSignedIn: boolean;
};

type PublicPassportCtaProps = {
  passportSlug: string | null;
  passportUserId: string;
  placement: "top" | "bottom";
};

const SIGNUP_HREF = "/sign-up?next=%2Fprofile";

export function PublicPassportAnalytics({
  featuredProjectId,
  passportSlug,
  passportUserId,
  projectCount,
  viewerSignedIn
}: PublicPassportAnalyticsProps) {
  useEffect(() => {
    const baseProperties = {
      featured_project_id: featuredProjectId,
      passport_slug: passportSlug,
      passport_user_id: passportUserId,
      project_count: projectCount,
      viewer_signed_in: viewerSignedIn
    };

    trackMeritEvent("public_passport_viewed", baseProperties);
    trackMeritEvent("visitor_source_referrer_recorded", baseProperties);
  }, [featuredProjectId, passportSlug, passportUserId, projectCount, viewerSignedIn]);

  return null;
}

export function PublicPassportCta({
  passportSlug,
  passportUserId,
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
            passport_user_id: passportUserId,
            placement
          })
        }
      >
        Start yours
      </Link>
    </div>
  );
}
