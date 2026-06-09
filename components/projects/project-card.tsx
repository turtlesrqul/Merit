/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import type { ProjectCardData } from "@/lib/db/projects";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ProjectCardProps = {
  project: ProjectCardData;
  showAuthor?: boolean;
  actions?: React.ReactNode;
};

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

  return (
    <Card className="space-y-0 overflow-hidden border-[#e2d8c8] bg-[#fdfbf7] p-0 shadow-[0_3px_10px_rgba(18,18,18,0.08),0_26px_44px_rgba(18,18,18,0.1)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(18,18,18,0.12),0_32px_52px_rgba(18,18,18,0.14)]">
      <Link className="group block" href={`/projects/${project.projectId}`}>
        <div className="relative aspect-[16/9] bg-[#ece4d4]">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.025] ${
                visual.source === "cover" ? "bg-[#f6f2e8] object-contain p-3" : "object-cover"
              }`}
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(197,166,90,0.26),transparent_34%),linear-gradient(120deg,#f7edd8_0%,#f8f4eb_55%,#f3efe7_100%)] text-sm font-medium text-[#635c50]">
              Visual preview coming soon
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f0d09]/40 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            {project.feedLabel ? (
              <Badge className="border-none bg-[#1a1814]/90 text-[#f7f4ec] shadow-sm">{project.feedLabel}</Badge>
            ) : null}
            <Badge className="border-none bg-white/92 text-[#1e1a14] shadow-sm">
              {labelProjectType(project.projectType)}
            </Badge>
          </div>
        </div>
      </Link>

      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge>{project.category || "Project"}</Badge>
          <p className="text-xs text-[#7a7265]">{new Date(project.createdAt).toLocaleDateString()}</p>
        </div>

        <Link className="block space-y-2" href={`/projects/${project.projectId}`}>
          <h3 className="line-clamp-2 text-[2rem] font-semibold leading-[1.02] tracking-tight text-[#171512]">
            {project.title}
          </h3>
          <p className="line-clamp-2 text-[15px] text-[#343026]">{project.hook || "No hook added yet."}</p>
        </Link>

        {showAuthor ? (
          <p className="text-sm text-[#6a6257]">
            by <span className="font-semibold text-[#1f1b15]">{project.authorName ?? "Candidate"}</span>
            {project.authorHeadline ? ` • ${project.authorHeadline}` : ""}
          </p>
        ) : null}

        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 5).map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-[#61594d]">
          <span>{project.engagement.views} views</span>
          <span className="text-[#a89b83]">•</span>
          <span>{project.engagement.likes} likes</span>
          <span className="text-[#a89b83]">•</span>
          <span>{project.engagement.saves} saves</span>
        </div>

        {actions ? <div className="flex flex-wrap gap-2 border-t border-[#ece3d5] pt-3">{actions}</div> : null}
      </div>
    </Card>
  );
}
