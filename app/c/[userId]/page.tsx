import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  PublicPassportAnalytics,
  PublicPassportCta
} from "@/components/analytics/public-passport-analytics";
import {
  CollapsibleProjectDescription,
  CollapsibleText
} from "@/components/profile/collapsible-project-description";
import { PublicProfileActions } from "@/components/profile/public-profile-actions";
import { SkillTagsToggle } from "@/components/profile/skill-tags-toggle";
import { Badge } from "@/components/ui/badge";
import { ActionIcon, iconControlClassName } from "@/components/ui/action-icon";
import { fetchPublicRecruiterOpportunities } from "@/lib/db/opportunities";
import { getViewerProfile } from "@/lib/db/profile";
import { fetchPublicCandidateData, type ProjectCardData } from "@/lib/db/projects";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
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

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildPassportProjectHref(projectId: string, passportUserId: string) {
  return `/projects/${projectId}?from=passport&passport=${encodeURIComponent(passportUserId)}`;
}

function ProjectArchiveItem({
  passportUserId,
  project
}: {
  passportUserId: string;
  project: ProjectCardData;
}) {
  const visual = resolveProjectVisualPreview({
    artifacts: project.artifacts,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType
  });

  return (
    <article className="group">
      <a className="block" href={buildPassportProjectHref(project.projectId, passportUserId)}>
        <div className="relative aspect-[16/10] overflow-hidden bg-[#e5ded1]">
          {visual.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${project.title} preview`}
              className="h-full w-full object-cover"
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#7b705f]">
              Preview coming soon
            </div>
          )}
          {project.category ? (
            <span className="absolute bottom-3 left-3 bg-[#fbf8f0] px-2.5 py-1 text-xs text-[#16130f]">
              {project.category}
            </span>
          ) : null}
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-serif text-xl leading-tight text-[#16130f]">{project.title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-[#7b705f]">{project.hook}</p>
        </div>
      </a>
    </article>
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
  const portfolioLinks = candidate.portfolioLinks.filter((link) => !isValidCvLink(link));
  const displayName = candidate.name ?? "Merit User";
  const featuredProject = candidate.projects.find((project) => project.isFeatured) ?? candidate.projects[0] ?? null;
  const archiveProjects = candidate.projects.filter((project) => project.projectId !== featuredProject?.projectId);
  const featuredVisual = featuredProject
    ? resolveProjectVisualPreview({
        artifacts: featuredProject.artifacts,
        coverImageUrl: featuredProject.coverImageUrl,
        projectType: featuredProject.projectType
      })
    : null;
  const skillList = Array.from(new Set(candidate.projects.flatMap((project) => project.skills)));

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <PublicPassportAnalytics
        featuredProjectId={featuredProject?.projectId ?? null}
        isOwner={user?.id === candidate.userId}
        ownerId={candidate.userId}
        passportId={candidate.userId}
        passportSlug={candidate.passportSlug}
        profileCompletionPercentage={candidate.profileCompletionScore}
        projectCount={candidate.projects.length}
        viewerSignedIn={Boolean(user)}
      />
      <section className="editorial-container pt-8 sm:pt-10">
        <div className="grid gap-4 border-b border-[#d7cebd] pb-5 sm:pb-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex h-14 w-14 items-center justify-center bg-[#dfd6c6] font-serif text-xl text-[#7b705f] sm:h-16 sm:w-16 sm:text-2xl">
              {initialsForName(displayName)}
            </div>
            <div className="max-w-4xl space-y-2.5">
              <h1 className="font-serif text-3xl leading-[1.04] text-[#16130f] sm:text-4xl lg:text-[2.75rem]">
                {displayName}
              </h1>
              {candidate.headline ? (
                <p className="max-w-3xl text-sm leading-6 text-[#7b705f] sm:text-base">{candidate.headline}</p>
              ) : null}
              <div className="space-y-1 text-xs uppercase tracking-[0.12em] text-[#7b705f] sm:text-sm">
                <p>{candidate.roleType === "recruiter" ? "Recruiter Passport" : "Passport"}</p>
                {candidate.targetRoles.length > 0 ? (
                  <p className="text-[#d8aa14]">Open to {candidate.targetRoles.slice(0, 2).join(" / ")}</p>
                ) : null}
              </div>
            </div>
          </div>
          <PublicProfileActions
            contactEmail={candidate.contactEmail}
            passportSlug={candidate.passportSlug}
            passportUserId={candidate.userId}
            profileName={displayName}
          />
        </div>

        <div className="pt-8 sm:pt-10">
          <p className="label-caps mb-4">Featured work</p>
          {featuredProject ? (
            <article className="space-y-5">
              <a className="block" href={buildPassportProjectHref(featuredProject.projectId, candidate.userId)}>
                <div className="overflow-hidden">
                  {featuredVisual?.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${featuredProject.title} preview`}
                      className="mx-auto max-h-[360px] max-w-full object-contain sm:max-h-[420px]"
                      src={featuredVisual.previewUrl}
                    />
                  ) : (
                    <div className="flex min-h-60 items-center justify-center bg-[#e5ded1] text-[#7b705f]">
                      Preview coming soon
                    </div>
                  )}
                </div>
              </a>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="max-w-3xl space-y-3">
                  <h2 className="font-serif text-2xl leading-tight text-[#16130f]">{featuredProject.title}</h2>
                  <CollapsibleText
                    className="text-[#7b705f]"
                    collapsedClassName="line-clamp-2"
                    description={featuredProject.hook}
                    threshold={140}
                  />
                  <CollapsibleProjectDescription
                    description={
                      featuredProject.whatWasBuilt ||
                      featuredProject.problemSolved ||
                      "No project description has been added yet."
                    }
                  />
                </div>
                <a
                  aria-label="View featured case study"
                  className={iconControlClassName()}
                  href={buildPassportProjectHref(featuredProject.projectId, candidate.userId)}
                  title="View featured case study"
                >
                  <ActionIcon name="eye" />
                </a>
              </div>
            </article>
          ) : (
            <div className="border border-dashed border-[#d7cebd] px-8 py-10 text-center text-[#7b705f]">
              No public projects yet.
            </div>
          )}
        </div>

        {archiveProjects.length > 0 ? (
          <details className="group pt-12">
            <summary className="mb-5 flex cursor-pointer list-none items-center justify-between border-b border-[#d7cebd] pb-4">
              <p className="label-caps">Selected works</p>
              <span className="flex items-center gap-2 text-sm text-[#7b705f]">
                {archiveProjects.length} more
                <span className={iconControlClassName({ className: "h-8 w-8 transition-transform group-open:rotate-180", variant: "ghost" })}>
                  <ActionIcon name="chevron-down" />
                </span>
              </span>
            </summary>
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
              {archiveProjects.map((project) => (
                <ProjectArchiveItem
                  key={project.projectId}
                  passportUserId={candidate.userId}
                  project={project}
                />
              ))}
            </div>
          </details>
        ) : null}

        {candidate.roleType === "recruiter" ? (
          <div className="pt-12">
            <h2 className="mb-5 font-serif text-2xl text-[#16130f]">Posted opportunities</h2>
            {recruiterOpportunities.length === 0 ? (
              <p className="text-sm text-[#7b705f]">No opportunities posted yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recruiterOpportunities.map((opportunity) => (
                  <article className="space-y-3 border border-[#d7cebd] bg-[#eee8dd] p-5" key={opportunity.opportunityId}>
                    <div className="space-y-1">
                      <h3 className="font-serif text-2xl text-[#16130f]">{opportunity.title}</h3>
                      <p className="text-sm text-[#7b705f]">{opportunity.company}</p>
                    </div>
                    <CollapsibleText
                      className="text-sm leading-6 text-[#7b705f]"
                      collapsedClassName="line-clamp-3"
                      description={opportunity.description}
                      threshold={180}
                    />
                    {opportunity.skillsSought.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {opportunity.skillsSought.map((skill) => (
                          <Badge key={`${opportunity.opportunityId}-${skill}`}>{skill}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-8 border-t border-[#d7cebd] pt-12 md:grid-cols-[1fr_1fr]">
          <section className="space-y-4">
            <p className="label-caps">About</p>
            {candidate.bio ? (
              <CollapsibleText
                className="max-w-xl text-[#7b705f]"
                collapsedClassName="line-clamp-4"
                description={candidate.bio}
                threshold={220}
              />
            ) : (
              <p className="text-base leading-7 text-[#7b705f]">No biography has been added yet.</p>
            )}
            {cvLink ? (
              <a className="inline-flex text-sm text-[#16130f] underline underline-offset-4" href={cvLink} rel="noreferrer" target="_blank">
                Open Resume
              </a>
            ) : null}
          </section>

          <section className="space-y-6">
            {skillList.length > 0 ? (
              <div className="space-y-4">
                <p className="label-caps">Capabilities</p>
                <SkillTagsToggle limit={8} skills={skillList} />
              </div>
            ) : null}
            {portfolioLinks.length > 0 ? (
              <div className="space-y-4">
                <p className="label-caps">Links</p>
                <div className="flex flex-wrap gap-3">
                  {portfolioLinks.map((link, index) => (
                    <a
                      className="inline-flex text-sm text-[#16130f] underline underline-offset-4"
                      href={link}
                      key={link}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {portfolioLinks.length === 1 ? "Open Portfolio" : `Open Portfolio ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {candidate.contactEmail ? (
              <div className="space-y-2">
                <p className="label-caps">Contact</p>
                <a className="text-sm text-[#16130f] underline underline-offset-4" href={`mailto:${candidate.contactEmail}`}>
                  {candidate.contactEmail}
                </a>
              </div>
            ) : null}
          </section>
        </div>

        {!user ? (
          <div className="pt-10">
            <PublicPassportCta
              ownerId={candidate.userId}
              passportId={candidate.userId}
              passportSlug={candidate.passportSlug}
              placement="bottom"
            />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
