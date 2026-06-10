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
    <Card className="space-y-0 overflow-hidden border-0 bg-transparent p-0">
      <Link className="group block" href={`/projects/${project.projectId}`}>
        <div className="relative aspect-[16/10] bg-[#e5ded1]">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className="h-full w-full object-contain p-2"
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#e5ded1] text-sm font-medium text-[#7b705f]">
              Visual preview coming soon
            </div>
          )}
          <span className="absolute bottom-3 left-3 bg-[#fbf8f0] px-2.5 py-1 text-xs text-[#16130f]">
            {project.category || labelProjectType(project.projectType)}
          </span>
        </div>
      </Link>

      <div className="space-y-2 pt-3">
        <Link className="block space-y-2" href={`/projects/${project.projectId}`}>
          <h3 className="line-clamp-2 font-serif text-xl leading-tight text-[#16130f]">{project.title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-[#7b705f]">{project.hook || "No hook added yet."}</p>
        </Link>

        {showAuthor ? (
          <p className="text-sm text-[#7b705f]">
            {project.authorName ?? "Candidate"}
            {project.authorHeadline ? ` / ${project.authorHeadline}` : ""}
          </p>
        ) : null}

        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 4).map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        {actions ? <div className="flex flex-wrap gap-2 border-t border-[#d7cebd] pt-3">{actions}</div> : null}
      </div>
    </Card>
  );
}
