import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchDirectoryMembers, type DirectoryMember, getViewerProfile } from "@/lib/db/profile";
import { fetchDiscoveryProjects, type ProjectCardData } from "@/lib/db/projects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function matchesProject(project: ProjectCardData, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    project.title,
    project.hook,
    project.problemSolved,
    project.whatWasBuilt,
    project.category,
    project.projectType,
    project.impact ?? "",
    project.authorName ?? "",
    project.authorHeadline ?? "",
    project.skills.join(" "),
    project.artifacts.map((artifact) => `${artifact.type} ${artifact.label}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function matchesMember(member: DirectoryMember, normalizedQuery: string) {
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q.trim() : "";
  const normalizedQuery = normalizeText(query);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [viewerProfile, allProjects, allMembers] = await Promise.all([
    getViewerProfile(supabase, user.id),
    fetchDiscoveryProjects(supabase),
    fetchDirectoryMembers(supabase)
  ]);

  const matchedProjects = allProjects
    .filter((project) => matchesProject(project, normalizedQuery))
    .slice(0, 18);
  const matchedMembers = allMembers.filter((member) => matchesMember(member, normalizedQuery)).slice(0, 18);
  const showNoMatches = normalizedQuery.length > 0 && matchedProjects.length === 0 && matchedMembers.length === 0;

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user.email}>
      <section className="editorial-container py-16">
        <header className="mb-14 border-b border-[#d7cebd] pb-10">
          <h1 className="font-serif text-6xl leading-none text-[#16130f]">Search</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#7b705f]">
            {normalizedQuery
              ? `Showing results for "${query}".`
              : "Search people and projects from the dashboard header, then browse the matching archive."}
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.12em] text-[#7b705f]">
            {matchedMembers.length} people, {matchedProjects.length} projects
          </p>
        </header>

        {showNoMatches ? (
          <Card className="border-dashed bg-transparent text-center">
            <p className="text-sm text-[#7b705f]">No users or projects matched that search yet.</p>
          </Card>
        ) : null}

        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-[#d7cebd] pb-4">
            <h2 className="font-serif text-4xl text-[#16130f]">People</h2>
            <p className="text-sm text-[#7b705f]">{matchedMembers.length}</p>
          </div>
          {matchedMembers.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <p className="text-sm text-[#7b705f]">No people matched.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matchedMembers.map((member) => (
                <Card className="space-y-4" key={member.userId}>
                  <div className="flex items-start justify-between gap-3 border-b border-[#d7cebd] pb-4">
                    <div>
                      <p className="font-serif text-2xl text-[#16130f]">{member.name ?? "Merit User"}</p>
                      {member.headline ? <p className="mt-1 text-sm leading-6 text-[#7b705f]">{member.headline}</p> : null}
                    </div>
                    <Badge className="capitalize">{member.roleType ?? "candidate"}</Badge>
                  </div>

                  <p className="text-sm text-[#7b705f]">
                    {member.projectCount} project{member.projectCount === 1 ? "" : "s"}
                  </p>

                  {member.topSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {member.topSkills.slice(0, 6).map((skill) => (
                        <Badge key={`${member.userId}-${skill}`}>{skill}</Badge>
                      ))}
                    </div>
                  ) : null}

                  <Link className="text-sm text-[#16130f] underline underline-offset-4" href={`/c/${member.userId}`}>
                    View profile
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-20 space-y-6">
          <div className="flex items-end justify-between border-b border-[#d7cebd] pb-4">
            <h2 className="font-serif text-4xl text-[#16130f]">Projects</h2>
            <p className="text-sm text-[#7b705f]">{matchedProjects.length}</p>
          </div>
          {matchedProjects.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <p className="text-sm text-[#7b705f]">No projects matched.</p>
            </Card>
          ) : (
            <div className="grid gap-x-12 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
              {matchedProjects.map((project) => (
                <ProjectCard key={project.projectId} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
