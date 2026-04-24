"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { ProjectOwnerActions } from "@/components/projects/project-owner-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProjectCardData } from "@/lib/db/projects";

type ProfileProjectSearchProps = {
  ownProjects: ProjectCardData[];
  savedProjects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

function projectMatchesQuery(project: ProjectCardData, query: string) {
  if (!query.trim()) {
    return true;
  }

  const searchableText = [
    project.title,
    project.problemSolved,
    project.whatWasBuilt,
    project.category,
    project.impact ?? "",
    project.skills.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query.trim().toLowerCase());
}

export function ProfileProjectSearch({
  ownProjects,
  savedProjects,
  savedProjectIds,
  inspiredProjectIds
}: ProfileProjectSearchProps) {
  const [query, setQuery] = useState("");
  const savedIds = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);
  const inspiredIds = useMemo(() => new Set(inspiredProjectIds), [inspiredProjectIds]);

  const visibleOwnProjects = useMemo(
    () => ownProjects.filter((project) => projectMatchesQuery(project, query)),
    [ownProjects, query]
  );
  const visibleSavedProjects = useMemo(
    () => savedProjects.filter((project) => projectMatchesQuery(project, query)),
    [savedProjects, query]
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink-900">Search your project library</p>
        <Input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, tags, category, impact..."
          value={query}
        />
        <p className="text-sm text-ink-600">
          {visibleOwnProjects.length + visibleSavedProjects.length} matching projects
        </p>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink-950">My projects</h2>
          <Link href="/projects/new">
            <Button>Add project</Button>
          </Link>
        </div>

        {ownProjects.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">
              You have no projects yet. Add one to start building proof of work.
            </p>
          </Card>
        ) : visibleOwnProjects.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">No personal projects match that search.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleOwnProjects.map((project) => (
              <ProjectCard
                actions={<ProjectOwnerActions projectId={project.projectId} />}
                key={project.projectId}
                project={project}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-ink-950">Saved projects</h2>
        {savedProjects.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">You have not saved any projects yet.</p>
          </Card>
        ) : visibleSavedProjects.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">No saved projects match that search.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleSavedProjects.map((project) => (
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
      </div>
    </div>
  );
}
