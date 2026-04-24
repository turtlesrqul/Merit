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
    project.problemSolved,
    project.whatWasBuilt,
    project.category,
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
      <section className="space-y-5">
        <Card className="space-y-2 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
          <h1 className="text-2xl font-semibold text-ink-950">Global search</h1>
          <p className="text-sm text-ink-700">
            {normalizedQuery
              ? `Showing results for "${query}".`
              : "Search people and projects from the top bar on any page."}
          </p>
          <p className="text-sm text-ink-700">
            {matchedMembers.length} people, {matchedProjects.length} projects
          </p>
        </Card>

        {showNoMatches ? (
          <Card>
            <p className="text-sm text-ink-700">No users or projects matched that search yet.</p>
          </Card>
        ) : null}

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-ink-950">People</h2>
          {matchedMembers.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">No people matched.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matchedMembers.map((member) => (
                <Card className="space-y-3 border-ink-100" key={member.userId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink-950">{member.name ?? "Merit User"}</p>
                      {member.headline ? <p className="text-sm text-ink-700">{member.headline}</p> : null}
                    </div>
                    <Badge className="capitalize">{member.roleType ?? "candidate"}</Badge>
                  </div>

                  <p className="text-sm text-ink-700">
                    {member.projectCount} project{member.projectCount === 1 ? "" : "s"}
                  </p>

                  {member.topSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {member.topSkills.slice(0, 6).map((skill) => (
                        <Badge key={`${member.userId}-${skill}`}>{skill}</Badge>
                      ))}
                    </div>
                  ) : null}

                  <Link className="text-sm font-semibold text-ink-900 underline underline-offset-2" href={`/c/${member.userId}`}>
                    View Passport
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-ink-950">Projects</h2>
          {matchedProjects.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">No projects matched.</p>
            </Card>
          ) : (
            <div className="space-y-4">
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
