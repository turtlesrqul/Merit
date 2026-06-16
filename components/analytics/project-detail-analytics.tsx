"use client";

import { useEffect } from "react";
import { trackMeritEvent } from "@/lib/analytics/client";

type ProjectDetailAnalyticsProps = {
  ownerUserId: string;
  passportUserId: string | null;
  projectId: string;
  source: string | null;
};

export function ProjectDetailAnalytics({
  ownerUserId,
  passportUserId,
  projectId,
  source
}: ProjectDetailAnalyticsProps) {
  useEffect(() => {
    trackMeritEvent("project_opened_viewed", {
      owner_user_id: ownerUserId,
      passport_user_id: passportUserId,
      project_id: projectId,
      source
    });
  }, [ownerUserId, passportUserId, projectId, source]);

  return null;
}
