/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ModelViewerCanvas } from "@/components/projects/model-viewer-canvas";
import { ActionIcon, IconButton, iconControlClassName } from "@/components/ui/action-icon";
import type { ProjectType } from "@/lib/artifacts";
import {
  resolveArtifactViewer,
  resolveProjectViewerSource,
  type ArtifactViewerKind
} from "@/lib/artifacts";

type ProjectPreviewArtifact = {
  url: string;
  type: string;
  previewUrl: string | null;
  label?: string;
};

type ProjectPreviewPlayerProps = {
  title: string;
  projectType: ProjectType;
  artifacts: ProjectPreviewArtifact[];
  coverImageUrl: string | null;
  mode?: "launcher" | "inline";
  launcherLabel?: string;
  className?: string;
};

type ViewerCandidate = {
  id: string;
  label: string;
  previewUrl: string | null;
  artifactType: string;
  viewer: ReturnType<typeof resolveArtifactViewer>;
};

function shouldUseIframe(kind: ArtifactViewerKind, embedUrl: string) {
  if (kind === "website" || kind === "pdf" || kind === "office") {
    return true;
  }
  if (kind === "video") {
    return /youtube\.com\/embed|player\.vimeo\.com\/video/i.test(embedUrl);
  }
  return false;
}

export function ProjectPreviewPlayer({
  title,
  projectType,
  artifacts,
  coverImageUrl,
  mode = "launcher",
  launcherLabel = "View on Merit",
  className
}: ProjectPreviewPlayerProps) {
  const defaultSource = useMemo(
    () => resolveProjectViewerSource({ artifacts, coverImageUrl, projectType }),
    [artifacts, coverImageUrl, projectType]
  );

  const candidates = useMemo(() => {
    const resolvedCandidates = artifacts
      .map((artifact, index) => {
        const viewer = resolveArtifactViewer(artifact.url, artifact.type);
        if (!viewer.embedUrl || viewer.kind === "unsupported") {
          return null;
        }

        return {
          id: `${artifact.url}-${index}`,
          label: artifact.label || `Artifact ${index + 1}`,
          previewUrl: artifact.previewUrl,
          artifactType: artifact.type,
          viewer
        } satisfies ViewerCandidate;
      })
      .filter((entry): entry is ViewerCandidate => Boolean(entry));

    const normalizedCover = coverImageUrl?.trim();
    const coverCandidate = normalizedCover
      ? ({
          id: "cover-image",
          label: "Chosen thumbnail",
          previewUrl: normalizedCover,
          artifactType: "image",
          viewer: {
            kind: "image" as const,
            directUrl: normalizedCover,
            embedUrl: normalizedCover,
            supportsFullscreen: true,
            reason: null
          }
        } satisfies ViewerCandidate)
      : null;

    if (coverCandidate) {
      return [coverCandidate, ...resolvedCandidates];
    }

    return resolvedCandidates;
  }, [artifacts, coverImageUrl]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [websiteStatus, setWebsiteStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (candidates.length === 0) {
      setSelectedCandidateId(null);
      return;
    }

    const fromDefaultSource = defaultSource.directUrl
      ? candidates.find((candidate) => candidate.viewer.directUrl === defaultSource.directUrl)
      : null;
    setSelectedCandidateId(fromDefaultSource?.id ?? candidates[0].id);
  }, [candidates, defaultSource.directUrl]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null,
    [candidates, selectedCandidateId]
  );

  useEffect(() => {
    if (!selectedCandidate || selectedCandidate.viewer.kind !== "website") {
      return;
    }

    setWebsiteStatus("loading");
    const timeout = window.setTimeout(() => {
      setWebsiteStatus((current) => (current === "loading" ? "failed" : current));
    }, 6500);

    return () => window.clearTimeout(timeout);
  }, [selectedCandidate]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  function renderSelectedViewer(size: "inline" | "modal") {
    if (!selectedCandidate || !selectedCandidate.viewer.embedUrl) {
      return (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,218,106,0.42),transparent_34%),linear-gradient(120deg,#fff3c8_0%,#f7f9fc_55%,#eef2f8_100%)] px-6 text-center text-sm text-ink-700">
          {defaultSource.reason ?? "No in-app preview available yet."}
        </div>
      );
    }

    const embedUrl = selectedCandidate.viewer.embedUrl;
    const isIframe = shouldUseIframe(selectedCandidate.viewer.kind, embedUrl);
    const heightClass = size === "modal" ? "h-[78vh]" : "h-[500px] md:h-[620px]";

    if (selectedCandidate.viewer.kind === "model3d") {
      return (
        <div className={heightClass}>
          <ModelViewerCanvas
            artifactType={selectedCandidate.artifactType}
            className="h-full w-full"
            modelUrl={embedUrl}
          />
        </div>
      );
    }

    if (selectedCandidate.viewer.kind === "image") {
      return (
        <div className={`${heightClass} bg-[#f5f1e8]`}>
          <img alt={`${title} visual`} className="h-full w-full object-contain" src={embedUrl} />
        </div>
      );
    }

    if (selectedCandidate.viewer.kind === "video" && !isIframe) {
      return (
        <div className={`${heightClass} bg-ink-950`}>
          <video className="h-full w-full" controls preload="metadata" src={embedUrl}>
            Your browser does not support inline video playback.
          </video>
        </div>
      );
    }

    if (selectedCandidate.viewer.kind === "website" && websiteStatus === "failed") {
      return (
        <div className={`${heightClass} space-y-4 bg-[#f5f1e8] p-5`}>
          <div className="rounded-xl border border-[#e4dbcb] bg-[#fffdf9] p-4 text-sm text-[#5e574c]">
            This site blocked in-app embedding. We switched to a safe fallback preview.
          </div>
          <a
            aria-label="Open live site"
            href={selectedCandidate.viewer.directUrl}
            rel="noreferrer"
            target="_blank"
            title="Open live site"
          >
            <span className={iconControlClassName()} title="Open live site">
              <ActionIcon name="external" />
            </span>
          </a>
          {selectedCandidate.previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-[#e4dbcb]">
              <img
                alt={`${title} fallback preview`}
                className="h-full max-h-[420px] w-full bg-[#f4efe5] object-contain"
                src={selectedCandidate.previewUrl}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#e4dbcb] bg-[#fffdf9] text-sm text-[#6b6356]">
              No fallback image available for this link.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={heightClass}>
        <iframe
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="h-full w-full border-0 bg-white"
          loading="lazy"
          onError={() => setWebsiteStatus("failed")}
          onLoad={() => setWebsiteStatus("ready")}
          sandbox={
            selectedCandidate.viewer.kind === "website"
              ? "allow-scripts allow-same-origin allow-forms allow-popups"
              : undefined
          }
          src={embedUrl}
          title={`${title} preview`}
        />
      </div>
    );
  }

  const canLaunch = candidates.length > 0;

  return (
    <div className={className}>
      {mode === "launcher" ? (
        <IconButton disabled={!canLaunch} icon="eye" label={canLaunch ? launcherLabel : "Preview unavailable"} onClick={() => setIsModalOpen(true)} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-[#e4dbcb] bg-[#fffdf9] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#25211b]">Live project viewer</p>
            <IconButton disabled={!canLaunch} icon="maximize" label="Open fullscreen preview" onClick={() => setIsModalOpen(true)} />
          </div>
          <div className="overflow-hidden rounded-xl border border-[#e4dbcb]">{renderSelectedViewer("inline")}</div>
          {candidates.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    selectedCandidate?.id === candidate.id
                      ? "border-[#c5a65a] bg-[#efe2c6] text-[#1e1a14]"
                      : "border-[#ddd4c6] bg-[#fffdf9] text-[#5f574b]"
                  }`}
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  type="button"
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          ) : null}
          {selectedCandidate?.viewer.reason ? (
            <p className="text-xs text-[#6b6356]">{selectedCandidate.viewer.reason}</p>
          ) : null}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#11100d]/80 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#ddd2bf] bg-[#fdfbf7] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8dece] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#25211b]">{title}</p>
                <p className="text-xs text-[#6b6356]">In-Merit full preview</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCandidate?.viewer.directUrl ? (
                  <a
                    aria-label="Open source artifact"
                    className={iconControlClassName()}
                    href={selectedCandidate.viewer.directUrl}
                    rel="noreferrer"
                    target="_blank"
                    title="Open source artifact"
                  >
                    <ActionIcon name="external" />
                  </a>
                ) : null}
                <IconButton icon="x" label="Close preview" onClick={() => setIsModalOpen(false)} variant="ghost" />
              </div>
            </div>

            {candidates.length > 1 ? (
              <div className="flex flex-wrap gap-2 border-b border-[#e8dece] px-4 py-2">
                {candidates.map((candidate) => (
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      selectedCandidate?.id === candidate.id
                        ? "border-[#c5a65a] bg-[#efe2c6] text-[#1e1a14]"
                        : "border-[#ddd4c6] bg-[#fffdf9] text-[#5f574b]"
                    }`}
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    type="button"
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex-1 overflow-auto bg-[#f5f1e8] p-3 sm:p-4">{renderSelectedViewer("modal")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
