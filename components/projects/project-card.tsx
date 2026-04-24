/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ProjectCardData } from "@/lib/db/projects";

type ProjectCardProps = {
  project: ProjectCardData;
  showAuthor?: boolean;
  actions?: React.ReactNode;
};

export function ProjectCard({ project, showAuthor = true, actions }: ProjectCardProps) {
  const primaryArtifact = project.artifacts[0] ?? null;

  return (
    <Card className="space-y-4 border-ink-100">
      <div className="overflow-hidden rounded-xl border border-ink-100">
        {primaryArtifact ? (
          <a className="block" href={primaryArtifact.url} rel="noreferrer" target="_blank">
            <div className="relative aspect-video bg-ink-100">
              {primaryArtifact.previewUrl ? (
                <img
                  alt={`${project.title} preview`}
                  className="h-full w-full object-cover"
                  src={primaryArtifact.previewUrl}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-500">
                  Preview unavailable
                </div>
              )}
              <div className="absolute left-3 top-3">
                <Badge className="bg-white/92 capitalize text-ink-900 shadow-sm">{primaryArtifact.type}</Badge>
              </div>
            </div>
          </a>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-ink-50 text-sm text-ink-500">
            No artifacts added yet
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge>{project.category || "Project"}</Badge>
        <p className="text-xs text-ink-500">{new Date(project.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-[1.3rem] font-semibold leading-tight text-ink-950">{project.title}</h3>
        <p className="text-sm text-ink-700">
          <span className="font-semibold text-ink-900">Problem solved:</span> {project.problemSolved}
        </p>
        <p className="text-sm text-ink-700">
          <span className="font-semibold text-ink-900">What was built:</span> {project.whatWasBuilt}
        </p>
        {project.impact ? (
          <p className="text-sm text-ink-700">
            <span className="font-semibold text-ink-900">Impact:</span> {project.impact}
          </p>
        ) : null}
      </div>

      {project.skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {project.skills.map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      ) : null}

      {project.artifacts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Proof links</p>
          <div className="flex flex-wrap gap-2">
            {project.artifacts.slice(0, 4).map((artifact) => (
              <a
                className="inline-flex max-w-full items-center rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-sm text-ink-900 underline decoration-sun-300 underline-offset-2"
                href={artifact.url}
                key={artifact.url}
                rel="noreferrer"
                target="_blank"
              >
                {artifact.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        {showAuthor ? (
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-ink-900">{project.authorName ?? "Candidate"}</p>
            {project.authorHeadline ? (
              <p className="text-sm text-ink-600">{project.authorHeadline}</p>
            ) : null}
          </div>
        ) : (
          <span />
        )}
        <Link
          className="text-sm font-semibold text-ink-900 underline underline-offset-2"
          href={`/c/${project.userId}`}
        >
          View Passport
        </Link>
      </div>

      {actions ? <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">{actions}</div> : null}
    </Card>
  );
}
