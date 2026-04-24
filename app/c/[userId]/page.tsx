import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchPublicRecruiterOpportunities } from "@/lib/db/opportunities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchPublicCandidateData } from "@/lib/db/projects";
import { getViewerProfile } from "@/lib/db/profile";

type PublicProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { userId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const viewerProfile = user ? await getViewerProfile(supabase, user.id) : null;
  const candidate = await fetchPublicCandidateData(supabase, userId);

  if (!candidate) {
    notFound();
  }
  const recruiterOpportunities =
    candidate.roleType === "recruiter"
      ? await fetchPublicRecruiterOpportunities(supabase, candidate.userId)
      : [];

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <section className="space-y-6">
        <Card className="space-y-2 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
          <h1 className="text-2xl font-semibold text-ink-950">{candidate.name ?? "Candidate"}</h1>
          {candidate.headline ? <p className="text-sm text-ink-700">{candidate.headline}</p> : null}
          {candidate.bio ? <p className="text-sm text-ink-700">{candidate.bio}</p> : null}
          {candidate.contactEmail ? (
            <p className="text-sm text-ink-700">Contact: {candidate.contactEmail}</p>
          ) : null}
          {candidate.portfolioLinks.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink-900">Portfolio links</p>
              {candidate.portfolioLinks.map((link) => (
                <a
                  className="block truncate text-sm text-ink-900 underline underline-offset-2"
                  href={link}
                  key={link}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link}
                </a>
              ))}
            </div>
          ) : null}
        </Card>

        {candidate.roleType === "recruiter" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-ink-950">Posted opportunities</h2>
            {recruiterOpportunities.length === 0 ? (
              <Card>
                <p className="text-sm text-ink-700">No opportunities posted yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {recruiterOpportunities.map((opportunity) => (
                  <Card className="space-y-3 border-ink-100" key={opportunity.opportunityId}>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-ink-950">{opportunity.title}</h3>
                      <p className="text-sm text-ink-700">{opportunity.company}</p>
                      <p className="text-xs text-ink-500">
                        Posted {new Date(opportunity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-ink-700">{opportunity.description}</p>
                    {opportunity.skillsSought.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {opportunity.skillsSought.map((skill) => (
                          <Badge key={`${opportunity.opportunityId}-${skill}`}>{skill}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-600">No explicit skills listed.</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-ink-950">Projects</h2>
          {candidate.projects.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">No public projects yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {candidate.projects.map((project) => (
                <ProjectCard key={project.projectId} project={project} showAuthor={false} />
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
