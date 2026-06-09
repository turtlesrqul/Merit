/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

type ProjectLivePreviewProps = {
  title: string;
  projectType: "web" | "design" | "document" | "other";
  livePreviewUrl: string | null;
  previewImageUrl: string | null;
};

export function ProjectLivePreview({
  title,
  projectType,
  livePreviewUrl,
  previewImageUrl
}: ProjectLivePreviewProps) {
  const [liveFailed, setLiveFailed] = useState(false);
  const shouldTryLive = projectType === "web" && Boolean(livePreviewUrl) && !liveFailed;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
      <div className="aspect-[16/9] bg-ink-100">
        {shouldTryLive && livePreviewUrl ? (
          <iframe
            className="h-full w-full bg-white"
            loading="lazy"
            onError={() => setLiveFailed(true)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            src={livePreviewUrl}
            title={`${title} live preview`}
          />
        ) : previewImageUrl ? (
          <img
            alt={`${title} preview`}
            className="h-full w-full bg-slate-100 object-contain p-2"
            src={previewImageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,218,106,0.42),transparent_34%),linear-gradient(120deg,#fff3c8_0%,#f7f9fc_55%,#eef2f8_100%)] text-sm font-medium text-ink-700">
            Preview unavailable
          </div>
        )}
      </div>
    </div>
  );
}
