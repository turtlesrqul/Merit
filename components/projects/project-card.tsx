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
  source?: "explore";
};

function labelProjectType(projectType: ProjectCardData["projectType"]) {
  if (projectType === "web") return "Web App";
  if (projectType === "design") return "Design";
  if (projectType === "document") return "Deck / Document";
  return "Other";
}

export function ProjectCard({ project, showAuthor = true, actions, source }: ProjectCardProps) {
  const visual = resolveProjectVisualPreview({
    artifacts: project.artifacts,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType
  });
  const projectHref = `/projects/${project.projectId}${source === "explore" ? "?from=explore" : ""}`;
  const visibleSkills = project.skills.slice(0, 3);
  const hiddenSkillCount = Math.max(project.skills.length - visibleSkills.length, 0);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-0 bg-transparent p-0">
      <div className="relative">
        <Link className="group block" href={projectHref}>
        <div className="relative aspect-[16/10] bg-[#e5ded1]">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className="h-full w-full object-cover"
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
        {actions ? (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] [&_button]:text-white [&_button:hover]:text-[#f3c945]">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-3">
        <Link className="block space-y-2" href={projectHref}>
          <h3 className="line-clamp-2 font-serif text-xl leading-tight text-[#16130f]">{project.title}</h3>
          <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-[#7b705f]">{project.hook || "No hook added yet."}</p>
        </Link>

        {showAuthor ? (
          <p className="line-clamp-1 min-h-5 text-sm text-[#7b705f]">
            {project.authorName ?? "Candidate"}
            {project.authorHeadline ? ` / ${project.authorHeadline}` : ""}
          </p>
        ) : null}

        {project.skills.length > 0 ? (
          <div className="mt-auto flex min-h-7 flex-wrap gap-2 overflow-hidden">
            {visibleSkills.map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
            {hiddenSkillCount > 0 ? <Badge>+{hiddenSkillCount}</Badge> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
