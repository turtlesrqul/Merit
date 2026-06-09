/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import type { ProjectCardData } from "@/lib/db/projects";
import { ProjectInteractions } from "@/components/projects/project-interactions";
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

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function toStableProjectKey(project: ProjectCardData) {
  const normalizedTitle = project.title.trim().toLowerCase().replace(/\s+/g, " ");
  return project.projectId.trim() || `${project.userId}:${normalizedTitle}`;
}

function dedupeProjects(projects: ProjectCardData[]) {
  const seen = new Set<string>();
  return projects.filter((project) => {
    const key = toStableProjectKey(project);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildRows(projects: ProjectCardData[]): DiscoveryRow[] {
  const uniqueProjects = dedupeProjects(projects);
  const byTrending = [...uniqueProjects].sort(
    (a, b) => toEngagementScore(b) - toEngagementScore(a) || toRecentMs(b) - toRecentMs(a)
  );
  const byRecent = [...uniqueProjects].sort((a, b) => toRecentMs(b) - toRecentMs(a));

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

  const rowCandidates: Array<Omit<DiscoveryRow, "projects"> & { candidates: ProjectCardData[] }> = [
    {
      id: "featured-builders",
      title: "Featured Builders",
      subtitle: "One standout proof card from each builder",
      candidates: featuredBuilders
    },
    {
      id: "trending-projects",
      title: "Trending Projects",
      subtitle: "Most engaged builds right now",
      candidates: byTrending
    },
    {
      id: "design-work",
      title: "Design Work",
      subtitle: "Interfaces, brand systems, and visual thinking",
      candidates: designProjects
    },
    {
      id: "startup-concepts",
      title: "Startup Concepts",
      subtitle: "Ideas turning into products",
      candidates: startupConcepts
    },
    {
      id: "engineering-builds",
      title: "Engineering Builds",
      subtitle: "Technical execution and shipped systems",
      candidates: engineeringBuilds
    },
    {
      id: "recruiter-picks",
      title: "Recruiter Picks",
      subtitle: "High-signal projects with immediate hiring relevance",
      candidates: recruiterPicks
    },
    {
      id: "hidden-gems",
      title: "Hidden Gems",
      subtitle: "Quiet launches worth discovering early",
      candidates: hiddenGems
    },
    {
      id: "recently-posted",
      title: "Recently Posted",
      subtitle: "Latest work added to Merit",
      candidates: byRecent
    }
  ];

  const assignedKeys = new Set<string>();
  const rows: DiscoveryRow[] = rowCandidates.map((row) => {
    const sectionProjects = row.candidates
      .filter((project) => {
        const key = toStableProjectKey(project);
        if (assignedKeys.has(key)) {
          return false;
        }
        assignedKeys.add(key);
        return true;
      })
      .slice(0, 12);

    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      projects: sectionProjects
    };
  });

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

  return (
    <article className="mx-auto h-full w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#e2d8c8] bg-[#fdfbf7] shadow-[0_8px_24px_rgba(19,17,12,0.11)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(19,17,12,0.16)] sm:max-w-none">
      <Link className="block" href={`/projects/${project.projectId}`}>
        <div className="relative aspect-[16/9] bg-[#ede6d8]">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className={`h-full w-full ${
                visual.source === "cover" ? "bg-[#f5f1e8] object-contain p-3" : "object-cover"
              }`}
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#5f584e]">Preview coming soon</div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11100d]/30 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-none bg-white/92 text-[#1f1b15]">{labelProjectType(project.projectType)}</Badge>
            {project.feedLabel ? (
              <Badge className="border-none bg-[#1a1814]/90 text-[#f7f4ec]">{project.feedLabel}</Badge>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <Link className="block" href={`/projects/${project.projectId}`}>
          <h3 className="line-clamp-2 text-[1.7rem] font-semibold leading-[1.08] tracking-tight text-[#171512] lg:text-[1.85rem]">
            {project.title}
          </h3>
          <p className="line-clamp-2 text-[15px] text-[#5a5348]">{project.hook || project.problemSolved}</p>
        </Link>

        <p className="text-sm text-[#6a6257]">
          by <span className="font-semibold text-[#1f1b15]">{project.authorName ?? "Candidate"}</span>
        </p>

        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 4).map((skill) => (
              <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#61594d]">
          <span>{project.engagement.views} views</span>
          <span className="text-[#a89b83]">|</span>
          <span>{project.engagement.likes} likes</span>
          <span className="text-[#a89b83]">|</span>
          <span>{project.engagement.saves} saves</span>
          <span className="text-[#a89b83]">|</span>
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="border-t border-[#e9e1d4] pt-3">
          <ProjectInteractions
            display="icons"
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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
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
  const focusedRows = useMemo(
    () => (selectedRowId ? rows.filter((row) => row.id === selectedRowId) : rows),
    [rows, selectedRowId]
  );

  useEffect(() => {
    if (selectedRowId && !rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [rows, selectedRowId]);

  if (projects.length === 0) {
    return (
      <section className="space-y-4">
        <Card className="space-y-3 border-[#dccca6] bg-gradient-to-r from-[#f6efdf] to-[#fdfbf7]">
          <h1 className="text-2xl font-semibold tracking-tight text-[#171512]">Discovery</h1>
          <p className="text-sm text-[#5b5448]">No projects yet. Publish the first proof card to start discovery.</p>
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
    <section className="space-y-4">
      <Card className="space-y-3 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7] p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6455]">Discovery</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171512]">Proof of work, before pedigree.</h1>
          <p className="max-w-3xl text-sm text-[#5d564a]">
            Browse like an exhibition: curated rows, larger frames, and projects that ask for real attention.
          </p>
          <div className="luxury-rule mt-2 w-full max-w-lg" />
        </div>
        <Input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, skills, builders, categories..."
          value={query}
        />
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5">
            {selectedRowId ? (
              <button
                className="rounded-full border border-[#e4bb35] bg-[#fff3cf] px-3 py-1 text-xs font-semibold text-[#3a3123] hover:bg-[#fce7ad]"
                onClick={() => setSelectedRowId(null)}
                type="button"
              >
                All Categories
              </button>
            ) : null}
            {rows.map((row) => {
              const selected = selectedRowId === row.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? "border-[#e4bb35] bg-[#f4cf59] text-[#171512]"
                        : "border-[#ddd4c6] bg-[#fffdf9] text-[#625a4d] hover:border-[#c5a65a] hover:bg-[#f6efdf] hover:text-[#1f1b15]"
                  }`}
                  key={row.id}
                  onClick={() => setSelectedRowId(selected ? null : row.id)}
                  type="button"
                >
                  {row.title}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {focusedRows.length === 0 ? (
        <Card>
          <p className="text-sm text-[#5d564a]">
            {rows.length === 0 ? "No projects match your search yet." : "No projects available in this category."}
          </p>
        </Card>
      ) : (
        focusedRows.map((row) => (
          <section className="space-y-3" key={row.id}>
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[#171512]">{row.title}</h2>
              <p className="text-sm text-[#60594e]">{row.subtitle}</p>
            </div>
            <div className="px-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

