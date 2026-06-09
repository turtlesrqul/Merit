/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import type { ProjectCardData } from "@/lib/db/projects";
import { ProjectPreviewPlayer } from "@/components/projects/project-preview-player";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ProjectCardProps = {
  project: ProjectCardData;
  showAuthor?: boolean;
  actions?: React.ReactNode;
};

function getPrimaryLink(project: ProjectCardData) {
  const websiteArtifact = project.artifacts.find((artifact) => artifact.type === "website");
  if (websiteArtifact) {
    return websiteArtifact.url;
  }
  return project.artifacts[0]?.url ?? null;
}

function labelProjectType(projectType: ProjectCardData["projectType"]) {
  if (projectType === "web") return "Web App";
  if (projectType === "design") return "Design";
  if (projectType === "document") return "Deck / Document";
  return "Other";
}

export function ProjectCard({ project, showAuthor = true, actions }: ProjectCardProps) {
  const visual = resolveProjectVisualPreview({
    artifacts: project.artifacts,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType
  });
  const primaryLink = getPrimaryLink(project);

  return (
    <Card className="space-y-5 border-ink-100 p-0 shadow-[0_2px_8px_rgba(16,24,40,0.08),0_24px_42px_rgba(16,24,40,0.12)]">
      <div className="relative overflow-hidden rounded-t-2xl border-b border-ink-100">
        <Link className="block" href={`/projects/${project.projectId}`}>
          <div className="relative aspect-[16/9] bg-ink-100">
            {visual.previewUrl ? (
              <img
                alt={`${project.title} preview`}
                className={`h-full w-full transition-transform duration-300 hover:scale-[1.02] ${
                  visual.source === "cover" ? "bg-slate-100 object-contain p-2" : "object-cover"
                }`}
                src={visual.previewUrl}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,218,106,0.42),transparent_34%),linear-gradient(120deg,#fff3c8_0%,#f7f9fc_55%,#eef2f8_100%)] text-sm font-medium text-ink-700">
                Visual preview coming soon
              </div>
            )}
          </div>
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          {project.feedLabel ? (
            <Badge className="border-none bg-ink-950/90 text-white shadow-sm">{project.feedLabel}</Badge>
          ) : null}
          <Badge className="border-none bg-white/92 text-ink-900 shadow-sm">
            {labelProjectType(project.projectType)}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge>{project.category || "Project"}</Badge>
          <p className="text-xs text-ink-500">{new Date(project.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-semibold leading-tight text-ink-950">{project.title}</h3>
          <p className="text-base text-ink-800">{project.hook || "No hook added yet."}</p>
          {project.whatWasBuilt ? (
            <p className="line-clamp-2 text-sm text-ink-600">{project.whatWasBuilt}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-ink-100 bg-slate-50/70 px-3 py-2 text-sm text-ink-700">
          <span>{project.engagement.views} views</span>
          <span>{project.engagement.likes} likes</span>
          <span>{project.engagement.saves} saves</span>
        </div>

        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 8).map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
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
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-ink-900">
            <ProjectPreviewPlayer
              artifacts={project.artifacts}
              coverImageUrl={project.coverImageUrl}
              launcherLabel="View on Merit"
              projectType={project.projectType}
              title={project.title}
            />
            <Link className="underline underline-offset-2" href={`/projects/${project.projectId}`}>
              Open project
            </Link>
            {primaryLink ? (
              <a className="underline underline-offset-2" href={primaryLink} rel="noreferrer" target="_blank">
                Visit source
              </a>
            ) : null}
            <Link className="underline underline-offset-2" href={`/c/${project.userId}`}>
              View Passport
            </Link>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">{actions}</div> : null}
      </div>
    </Card>
  );
}
