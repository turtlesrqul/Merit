import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchPublicRecruiterOpportunities } from "@/lib/db/opportunities";
import { getViewerProfile } from "@/lib/db/profile";
import { fetchPublicCandidateData } from "@/lib/db/projects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidCvLink(link: string) {
  const trimmed = link.trim();
  if (!trimmed || !isHttpUrl(trimmed)) {
    return false;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized.includes("linkedin.com")) {
    return false;
  }
  return (
    /(resume|cv|curriculum)/i.test(normalized) ||
    /\.pdf(\?|#|$)/i.test(normalized) ||
    /\.docx?(\?|#|$)/i.test(normalized) ||
    /google\.com\/document/i.test(normalized)
  );
}

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
  const cvLink = candidate.portfolioLinks.find((link) => isValidCvLink(link)) ?? null;

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <section className="space-y-6">
        <Card className="space-y-2 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
          <h1 className="text-4xl font-semibold tracking-tight text-[#171512]">{candidate.name ?? "Merit User"}</h1>
          {candidate.headline ? <p className="text-sm text-[#5e574c]">{candidate.headline}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Badge className="capitalize">{candidate.roleType ?? "candidate"}</Badge>
            <Badge>{candidate.projects.length} project{candidate.projects.length === 1 ? "" : "s"}</Badge>
          </div>
        </Card>

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
                <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]" key={opportunity.opportunityId}>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-ink-950">{opportunity.title}</h3>
                      <p className="text-sm text-ink-700">{opportunity.company}</p>
                    </div>
                    <p className="text-sm text-ink-700">{opportunity.description}</p>
                    {opportunity.skillsSought.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {opportunity.skillsSought.map((skill) => (
                          <Badge key={`${opportunity.opportunityId}-${skill}`}>{skill}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]">
          <h2 className="text-lg font-semibold text-[#171512]">CV / Resume</h2>
          {cvLink ? (
            <>
              <a
                className="block truncate text-sm font-semibold text-ink-900 underline underline-offset-2"
                href={cvLink}
                rel="noreferrer"
                target="_blank"
              >
                Open in new tab
              </a>
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-ink-100 bg-ink-100">
                <iframe
                  className="h-full w-full bg-white"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  src={cvLink}
                  title="Public CV preview"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-[#5e574c]">No CV or resume has been added yet.</p>
          )}
        </Card>

        <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]">
          <h2 className="text-lg font-semibold text-[#171512]">About</h2>
          {candidate.bio ? <p className="text-sm text-[#5e574c]">{candidate.bio}</p> : null}
          {candidate.contactEmail ? <p className="text-sm text-[#5e574c]">Contact: {candidate.contactEmail}</p> : null}
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
      </section>
    </AppShell>
  );
}
