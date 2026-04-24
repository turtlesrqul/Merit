"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProjectCardData } from "@/lib/db/projects";

type DiscoveryFeedProps = {
  projects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

function filterProjects(projects: ProjectCardData[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return projects;
  }

  return projects.filter((project) => {
    const searchableText = [
      project.title,
      project.problemSolved,
      project.whatWasBuilt,
      project.category,
      project.impact ?? "",
      project.authorName ?? "",
      project.authorHeadline ?? "",
      project.skills.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function DiscoveryFeed({
  projects,
  savedProjectIds,
  inspiredProjectIds
}: DiscoveryFeedProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [onlyWithArtifacts, setOnlyWithArtifacts] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean))).sort()],
    [projects]
  );

  const visibleProjects = useMemo(() => {
    const queried = filterProjects(projects, query);
    const normalizedSkillFilter = skillFilter.trim().toLowerCase();

    return queried.filter((project) => {
      const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
      const matchesSkill =
        normalizedSkillFilter.length === 0 ||
        project.skills.some((skill) => skill.toLowerCase().includes(normalizedSkillFilter));
      const matchesArtifact = !onlyWithArtifacts || project.artifacts.length > 0;

      return matchesCategory && matchesSkill && matchesArtifact;
    });
  }, [projects, query, categoryFilter, skillFilter, onlyWithArtifacts]);
  const savedIds = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);
  const inspiredIds = useMemo(() => new Set(inspiredProjectIds), [inspiredProjectIds]);

  return (
    <section className="space-y-4">
      <Card className="space-y-2 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
        <h1 className="text-2xl font-semibold text-ink-950">Discovery feed</h1>
        <p className="text-sm text-ink-700">
          Scroll projects built by peers. Search by keywords, tags, or outcomes.
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, tags, tools, outcomes..."
            value={query}
          />
          <Input
            onChange={(event) => setSkillFilter(event.target.value)}
            placeholder="Filter by skill (e.g. figma, matlab)"
            value={skillFilter}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            className="w-full rounded-xl border border-ink-200 bg-white/90 px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white focus:border-sun-400 focus:ring-4 focus:ring-sun-100"
            onChange={(event) => setCategoryFilter(event.target.value)}
            value={categoryFilter}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All categories" : category}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-sun-50 px-3 py-2 text-sm text-ink-700">
            <input
              checked={onlyWithArtifacts}
              onChange={(event) => setOnlyWithArtifacts(event.target.checked)}
              type="checkbox"
            />
            Has artifacts
          </label>
        </div>
        <p className="text-sm text-ink-600">
          Showing {visibleProjects.length} of {projects.length} projects
        </p>
      </Card>

      {projects.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-ink-700">No projects yet. Add your first proof card.</p>
          <Link href="/projects/new">
            <Button>Add project</Button>
          </Link>
        </Card>
      ) : visibleProjects.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">No projects match that search yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleProjects.map((project) => (
            <ProjectCard
              actions={
                <ProjectInteractions
                  initialInspired={inspiredIds.has(project.projectId)}
                  initialSaved={savedIds.has(project.projectId)}
                  projectId={project.projectId}
                />
              }
              key={project.projectId}
              project={project}
            />
          ))}
        </div>
      )}
    </section>
  );
}
