"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DirectoryMember } from "@/lib/db/profile";

type PeopleDirectoryProps = {
  members: DirectoryMember[];
};

function matchesQuery(member: DirectoryMember, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    member.name ?? "",
    member.headline ?? "",
    member.bio ?? "",
    member.roleType ?? "",
    member.topSkills.join(" "),
    member.recentProjects.map((project) => project.title).join(" "),
    member.recentProjects.map((project) => project.category).join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

export function PeopleDirectory({ members }: PeopleDirectoryProps) {
  const [query, setQuery] = useState("");

  const visibleMembers = useMemo(
    () => members.filter((member) => matchesQuery(member, query)),
    [members, query]
  );

  return (
    <section className="editorial-container space-y-8 py-12">
      <header className="border-b border-[#d7cebd] pb-8">
        <h1 className="font-serif text-5xl leading-none text-[#16130f] sm:text-6xl">People</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#7b705f]">
          Find builders by name, role, skills, and recent project evidence. Projects stay in Explore; this page is for people.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(260px,480px)_1fr] md:items-center">
        <Input
          aria-label="Search people"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, headline, role, skill, or project title"
          value={query}
        />
        <p className="text-sm text-[#7b705f] md:text-right">
          Showing {visibleMembers.length} of {members.length} users
        </p>
      </div>

      {visibleMembers.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <p className="text-sm text-[#7b705f]">No people match that search.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleMembers.map((member) => (
            <Card className="space-y-4 bg-transparent" key={member.userId}>
              <div className="flex items-start justify-between gap-3 border-b border-[#d7cebd] pb-4">
                <div>
                  <p className="font-serif text-2xl leading-tight text-[#16130f]">
                    {member.name ?? "Merit User"}
                  </p>
                  {member.headline ? (
                    <p className="mt-1 text-sm leading-6 text-[#7b705f]">{member.headline}</p>
                  ) : null}
                </div>
                <Badge className="capitalize">{member.roleType ?? "candidate"}</Badge>
              </div>

              <p className="text-sm text-[#7b705f]">
                {member.projectCount} project{member.projectCount === 1 ? "" : "s"}
              </p>

              {member.topSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {member.topSkills.map((skill) => (
                    <Badge key={`${member.userId}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7b705f]">No skills tagged yet.</p>
              )}

              {member.recentProjects.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                    Recent evidence
                  </p>
                  {member.recentProjects.map((project) => (
                    <p className="text-sm text-[#7b705f]" key={`${member.userId}-${project.title}`}>
                      {project.title} <span className="text-[#9b907e]">({project.category})</span>
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="pt-1">
                <Link href={`/c/${member.userId}`}>
                  <Button variant="secondary">View Passport</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
