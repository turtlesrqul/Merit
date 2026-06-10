"use client";

import { useMemo, useState } from "react";
import type { ProjectCardData } from "@/lib/db/projects";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { Input } from "@/components/ui/input";

type DiscoveryFeedProps = {
  projects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
  showInteractions?: boolean;
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

function categoryOptions(projects: ProjectCardData[]) {
  const values = projects
    .map((project) => project.category || project.projectType)
    .filter(Boolean)
    .slice(0, 80);
  return ["All", ...Array.from(new Set(values)).slice(0, 10)];
}

export function DiscoveryFeed({
  projects,
  savedProjectIds,
  inspiredProjectIds,
  showInteractions = false
}: DiscoveryFeedProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => categoryOptions(projects), [projects]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesQuery = normalizedQuery ? toSearchText(project).includes(normalizedQuery) : true;
        const matchesCategory = category === "All" || (project.category || project.projectType) === category;
        return matchesQuery && matchesCategory;
      }),
    [category, normalizedQuery, projects]
  );

  return (
    <section className="editorial-container py-8 sm:py-9">
      <div className="mb-6">
          <h1 className="font-serif text-4xl leading-none text-[#16130f]">Explore</h1>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,460px)_1fr] lg:items-start">
          <Input
            aria-label="Search projects"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, profiles..."
            value={query}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((option) => (
              <button
                className={`shrink-0 border px-3 py-1.5 text-sm ${
                  option === category
                    ? "border-[#f3c945] bg-[#f3c945] text-[#16130f]"
                    : "border-[#16130f] bg-transparent text-[#16130f]"
                }`}
                key={option}
                onClick={() => setCategory(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-8 border-b border-[#d7cebd] text-sm">
        <span className="border-b-2 border-[#f3c945] pb-2.5 text-[#16130f]">Projects {filteredProjects.length}</span>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="border border-dashed border-[#d7cebd] px-8 py-16 text-center text-[#7b705f]">
          No projects matched that search yet.
        </div>
      ) : (
        <div className="grid gap-x-7 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              actions={
                showInteractions ? (
                  <ProjectInteractions
                    initialInspired={inspiredProjectIds.includes(project.projectId)}
                    initialSaved={savedProjectIds.includes(project.projectId)}
                    projectId={project.projectId}
                  />
                ) : null
              }
              key={project.projectId}
              project={project}
              source="explore"
            />
          ))}
        </div>
      )}
    </section>
  );
}
