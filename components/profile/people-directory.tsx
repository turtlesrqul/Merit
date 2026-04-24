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
    member.recentProjects.map((project) => project.title).join(" ")
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
    <section className="space-y-4">
      <Card className="space-y-2 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
        <h1 className="text-2xl font-semibold text-ink-950">People Directory</h1>
        <p className="text-sm text-ink-700">
          Browse all users, inspect profile signals, and open their Passport pages.
        </p>
      </Card>

      <Card className="space-y-3">
        <Input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, headline, role, skill, or project title"
          value={query}
        />
        <p className="text-sm text-ink-600">
          Showing {visibleMembers.length} of {members.length} users
        </p>
      </Card>

      {visibleMembers.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">No users match that search.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMembers.map((member) => (
            <Card className="space-y-3 border-ink-100" key={member.userId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink-950">
                    {member.name ?? "Merit User"}
                  </p>
                  {member.headline ? (
                    <p className="text-sm text-ink-700">{member.headline}</p>
                  ) : null}
                </div>
                <Badge className="capitalize">{member.roleType ?? "candidate"}</Badge>
              </div>

              <p className="text-sm text-ink-700">
                {member.projectCount} project{member.projectCount === 1 ? "" : "s"}
              </p>

              {member.topSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {member.topSkills.map((skill) => (
                    <Badge key={`${member.userId}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-600">No skills tagged yet.</p>
              )}

              {member.recentProjects.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                    Recent projects
                  </p>
                  {member.recentProjects.map((project) => (
                    <p className="text-sm text-ink-700" key={`${member.userId}-${project.title}`}>
                      {project.title} <span className="text-ink-500">({project.category})</span>
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
