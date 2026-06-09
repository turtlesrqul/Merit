/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import type { ProjectCardData } from "@/lib/db/projects";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { ProjectPreviewPlayer } from "@/components/projects/project-preview-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DiscoveryFeedProps = {
  projects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

type DiscoveryRow = {
  id: string;
  title: string;
  subtitle: string;
  projects: ProjectCardData[];
};

function toSearchText(project: ProjectCardData) {
  return [
    project.title,
    project.hook,
    project.problemSolved,
    project.whatWasBuilt,
    project.category,
    project.projectType,
    project.impact ?? "",
    project.authorName ?? "",
    project.authorHeadline ?? "",
    project.skills.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function toEngagementScore(project: ProjectCardData) {
  return project.engagement.views + project.engagement.likes * 2 + project.engagement.saves * 2;
}

function toRecentMs(project: ProjectCardData) {
  const parsed = Date.parse(project.createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function labelProjectType(projectType: ProjectCardData["projectType"]) {
  if (projectType === "web") return "Web";
  if (projectType === "design") return "Design";
  if (projectType === "document") return "Document";
  return "Build";
}

function getPrimaryLink(project: ProjectCardData) {
  const websiteArtifact = project.artifacts.find((artifact) => artifact.type === "website");
  if (websiteArtifact) {
    return websiteArtifact.url;
  }
  return project.artifacts[0]?.url ?? null;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function dedupeProjects(projects: ProjectCardData[]) {
  const seen = new Set<string>();
  return projects.filter((project) => {
    if (seen.has(project.projectId)) {
      return false;
    }
    seen.add(project.projectId);
    return true;
  });
}

function takeTop(projects: ProjectCardData[], limit = 12) {
  return dedupeProjects(projects).slice(0, limit);
}

function buildRows(projects: ProjectCardData[]): DiscoveryRow[] {
  const byTrending = [...projects].sort(
    (a, b) => toEngagementScore(b) - toEngagementScore(a) || toRecentMs(b) - toRecentMs(a)
  );
  const byRecent = [...projects].sort((a, b) => toRecentMs(b) - toRecentMs(a));

  const featuredBuilders = (() => {
    const authorPick = new Map<string, ProjectCardData>();
    byTrending.forEach((project) => {
      const key = project.userId;
      if (!key || authorPick.has(key)) {
        return;
      }
      authorPick.set(key, project);
    });
    return [...authorPick.values()];
  })();

  const designProjects = byTrending.filter((project) => {
    const text = toSearchText(project);
    return project.projectType === "design" || includesAny(text, ["design", "ux", "ui", "brand"]);
  });

  const startupConcepts = byTrending.filter((project) =>
    includesAny(toSearchText(project), ["startup", "saas", "founder", "market", "go-to-market", "product"])
  );

  const engineeringBuilds = byTrending.filter((project) => {
    const text = toSearchText(project);
    return (
      project.projectType === "web" ||
      includesAny(text, ["api", "backend", "typescript", "python", "react", "next.js", "infrastructure"])
    );
  });

  const recruiterPicks = byTrending.filter((project) => project.feedLabel === "Featured").concat(byTrending);

  const hiddenGems = byRecent.filter((project) => {
    const score = toEngagementScore(project);
    return score <= 3 && project.feedLabel !== "Featured";
  });

  const rows: DiscoveryRow[] = [
    {
      id: "featured-builders",
      title: "Featured Builders",
      subtitle: "One standout proof card from each builder",
      projects: takeTop(featuredBuilders)
    },
    {
      id: "trending-projects",
      title: "Trending Projects",
      subtitle: "Most engaged builds right now",
      projects: takeTop(byTrending)
    },
    {
      id: "design-work",
      title: "Design Work",
      subtitle: "Interfaces, brand systems, and visual thinking",
      projects: takeTop(designProjects)
    },
    {
      id: "startup-concepts",
      title: "Startup Concepts",
      subtitle: "Ideas turning into products",
      projects: takeTop(startupConcepts)
    },
    {
      id: "engineering-builds",
      title: "Engineering Builds",
      subtitle: "Technical execution and shipped systems",
      projects: takeTop(engineeringBuilds)
    },
    {
      id: "recruiter-picks",
      title: "Recruiter Picks",
      subtitle: "High-signal projects with immediate hiring relevance",
      projects: takeTop(recruiterPicks)
    },
    {
      id: "hidden-gems",
      title: "Hidden Gems",
      subtitle: "Quiet launches worth discovering early",
      projects: takeTop(hiddenGems)
    },
    {
      id: "recently-posted",
      title: "Recently Posted",
      subtitle: "Latest work added to Merit",
      projects: takeTop(byRecent)
    }
  ];

  return rows.filter((row) => row.projects.length > 0);
}

function DiscoveryRailCard({
  project,
  initialSaved,
  initialInspired
}: {
  project: ProjectCardData;
  initialSaved: boolean;
  initialInspired: boolean;
}) {
  const visual = resolveProjectVisualPreview({
    artifacts: project.artifacts,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType
  });
  const primaryLink = getPrimaryLink(project);

  return (
    <article className="w-[min(480px,90vw)] shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_8px_26px_rgba(16,24,40,0.12)]">
      <Link className="block" href={`/projects/${project.projectId}`}>
        <div className="relative aspect-[16/9] bg-ink-100">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className={`h-full w-full ${
                visual.source === "cover" ? "bg-slate-100 object-contain p-2" : "object-cover"
              }`}
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-700">Preview coming soon</div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-none bg-white/92 text-ink-900">{labelProjectType(project.projectType)}</Badge>
            {project.feedLabel ? (
              <Badge className="border-none bg-ink-950/88 text-white">{project.feedLabel}</Badge>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-xl font-semibold text-ink-950">{project.title}</h3>
          <p className="line-clamp-2 text-sm text-ink-700">{project.hook || project.problemSolved}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
          <span>{project.engagement.views} views</span>
          <span>{project.engagement.likes} likes</span>
          <span>{project.engagement.saves} saves</span>
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>

        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 4).map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-sm font-semibold text-ink-900">
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
          <Link className="underline underline-offset-2" href={`/c/${project.userId}`}>
            Builder passport
          </Link>
          {primaryLink ? (
            <a className="underline underline-offset-2" href={primaryLink} rel="noreferrer" target="_blank">
              Visit source
            </a>
          ) : null}
        </div>

        <div className="border-t border-ink-100 pt-3">
          <ProjectInteractions
            initialInspired={initialInspired}
            initialSaved={initialSaved}
            projectId={project.projectId}
          />
        </div>
      </div>
    </article>
  );
}

export function DiscoveryFeed({ projects, savedProjectIds, inspiredProjectIds }: DiscoveryFeedProps) {
  const [query, setQuery] = useState("");
  const savedIdSet = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);
  const inspiredIdSet = useMemo(() => new Set(inspiredProjectIds), [inspiredProjectIds]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }
    return projects.filter((project) => toSearchText(project).includes(normalizedQuery));
  }, [projects, query]);

  const rows = useMemo(() => buildRows(visibleProjects), [visibleProjects]);

  if (projects.length === 0) {
    return (
      <section className="space-y-4">
        <Card className="space-y-3 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
          <h1 className="text-2xl font-semibold text-ink-950">Discovery</h1>
          <p className="text-sm text-ink-700">No projects yet. Publish the first proof card to start discovery.</p>
          <div>
            <Link href="/projects/new">
              <Button>Add project</Button>
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <Card className="space-y-4 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-600">Discovery</p>
          <h1 className="text-3xl font-semibold text-ink-950">Explore builders by proof of work</h1>
          <p className="text-sm text-ink-700">
            Curated rows turn discovery into browsing, not form-scanning. Move across categories and open what pulls
            you in.
          </p>
        </div>
        <Input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, skills, builders, categories..."
          value={query}
        />
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {rows.map((row) => (
              <a
                className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-sun-300 hover:bg-sun-50 hover:text-ink-900"
                href={`#${row.id}`}
                key={row.id}
              >
                {row.title}
              </a>
            ))}
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">No projects match your search yet.</p>
        </Card>
      ) : (
        rows.map((row) => (
          <section className="space-y-3" id={row.id} key={row.id}>
            <div className="space-y-1 px-1">
              <h2 className="text-xl font-semibold text-ink-950">{row.title}</h2>
              <p className="text-sm text-ink-700">{row.subtitle}</p>
            </div>
            <div className="-mx-1 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4 px-1">
                {row.projects.map((project) => (
                  <DiscoveryRailCard
                    initialInspired={inspiredIdSet.has(project.projectId)}
                    initialSaved={savedIdSet.has(project.projectId)}
                    key={`${row.id}-${project.projectId}`}
                    project={project}
                  />
                ))}
              </div>
            </div>
          </section>
        ))
      )}
    </section>
  );
}
