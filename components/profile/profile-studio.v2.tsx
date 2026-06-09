/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import type { ProjectCardData } from "@/lib/db/projects";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { ProjectOwnerActions } from "@/components/projects/project-owner-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileRoleType = "candidate" | "recruiter";
type ProfileSectionId = "projects" | "passport" | "portfolio" | "cv" | "activity" | "skills" | "saved";

type ProfileStudioProps = {
  userId: string;
  initialProfile: {
    name: string;
    roleType: ProfileRoleType;
    headline: string;
    bio: string;
    contactEmail: string;
    targetRoles: string[];
    portfolioLinks: string[];
    profileCompletionScore: number;
  };
  ownProjects: ProjectCardData[];
  savedProjects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

const sections: Array<{ id: ProfileSectionId; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "passport", label: "Passport" },
  { id: "portfolio", label: "Portfolio" },
  { id: "cv", label: "CV" },
  { id: "activity", label: "Activity" },
  { id: "skills", label: "Skills" },
  { id: "saved", label: "Saved" }
];

function parseCommaSeparatedInput(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLineSeparatedInput(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatCreatedDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Recently";
  }
  return new Date(parsed).toLocaleDateString();
}

function toPortfolioLabel(link: string) {
  try {
    const { hostname } = new URL(link);
    return hostname.replace(/^www\./i, "");
  } catch {
    return "Portfolio";
  }
}

function findCvLink(links: string[]) {
  return (
    links.find((link) =>
      /(cv|resume|curriculum|google\.com\/document|\.pdf(\?|$))/i.test(link)
    ) ?? links[0] ?? ""
  );
}

function toProjectEngagementScore(project: ProjectCardData) {
  return project.engagement.views + project.engagement.likes * 2 + project.engagement.saves * 2;
}

function ProfileModal({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-950">{title}</h3>
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProjectRail({
  projects,
  emptyText,
  projectActions
}: {
  projects: ProjectCardData[];
  emptyText: string;
  projectActions: (project: ProjectCardData) => ReactNode;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-700">{emptyText}</p>
      </Card>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4 px-1">
        {projects.map((project) => (
          <div className="w-[min(450px,90vw)] shrink-0" key={project.projectId}>
            <ProjectCard actions={projectActions(project)} project={project} showAuthor={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileStudio({
  userId,
  initialProfile,
  ownProjects,
  savedProjects,
  savedProjectIds,
  inspiredProjectIds
}: ProfileStudioProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("projects");
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [passportSaving, setPassportSaving] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [identitySuccess, setIdentitySuccess] = useState<string | null>(null);
  const [passportSuccess, setPassportSuccess] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState(initialProfile.name);
  const [roleTypeDraft, setRoleTypeDraft] = useState<ProfileRoleType>(initialProfile.roleType);
  const [headlineDraft, setHeadlineDraft] = useState(initialProfile.headline);
  const [bioDraft, setBioDraft] = useState(initialProfile.bio);

  const [contactEmailDraft, setContactEmailDraft] = useState(initialProfile.contactEmail);
  const [targetRolesDraft, setTargetRolesDraft] = useState(initialProfile.targetRoles.join(", "));
  const [portfolioLinksDraft, setPortfolioLinksDraft] = useState(
    initialProfile.portfolioLinks.join("\n")
  );
  const [cvLinkDraft, setCvLinkDraft] = useState(findCvLink(initialProfile.portfolioLinks));
  const [selectedPortfolioLink, setSelectedPortfolioLink] = useState(
    initialProfile.portfolioLinks[0] ?? ""
  );
  const [portfolioEmbedFailed, setPortfolioEmbedFailed] = useState(false);
  const [cvEmbedFailed, setCvEmbedFailed] = useState(false);

  const savedIdSet = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);
  const inspiredIdSet = useMemo(() => new Set(inspiredProjectIds), [inspiredProjectIds]);

  const featuredProject = useMemo(
    () => [...ownProjects].sort((a, b) => toProjectEngagementScore(b) - toProjectEngagementScore(a))[0] ?? null,
    [ownProjects]
  );
  const featuredVisual = featuredProject
    ? resolveProjectVisualPreview({
        artifacts: featuredProject.artifacts,
        coverImageUrl: featuredProject.coverImageUrl,
        projectType: featuredProject.projectType
      })
    : null;

  const skillStats = useMemo(() => {
    const counts = new Map<string, number>();
    ownProjects.forEach((project) => {
      project.skills.forEach((skill) => {
        const normalized = skill.trim();
        if (!normalized) {
          return;
        }
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([skill, count]) => ({ skill, count }));
  }, [ownProjects]);

  const activityTimeline = useMemo(
    () =>
      [...ownProjects]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 6),
    [ownProjects]
  );

  useEffect(() => {
    if (profile.portfolioLinks.length === 0) {
      setSelectedPortfolioLink("");
      return;
    }

    if (!profile.portfolioLinks.includes(selectedPortfolioLink)) {
      setSelectedPortfolioLink(profile.portfolioLinks[0] ?? "");
    }
  }, [profile.portfolioLinks, selectedPortfolioLink]);

  useEffect(() => {
    setPortfolioEmbedFailed(false);
  }, [selectedPortfolioLink]);

  useEffect(() => {
    setCvEmbedFailed(false);
  }, [profile.portfolioLinks]);

  const openIdentityEditor = () => {
    setNameDraft(profile.name);
    setRoleTypeDraft(profile.roleType);
    setHeadlineDraft(profile.headline);
    setBioDraft(profile.bio);
    setIdentityError(null);
    setIdentitySuccess(null);
    setIdentityModalOpen(true);
  };

  const openPassportEditor = () => {
    setContactEmailDraft(profile.contactEmail);
    setTargetRolesDraft(profile.targetRoles.join(", "));
    setPortfolioLinksDraft(profile.portfolioLinks.join("\n"));
    setCvLinkDraft(findCvLink(profile.portfolioLinks));
    setPassportError(null);
    setPassportSuccess(null);
    setPassportModalOpen(true);
  };

  const saveIdentity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentitySaving(true);
    setIdentityError(null);
    setIdentitySuccess(null);

    const supabase = createBrowserSupabaseClient();
    const parsedScore = calculateProfileCompletionScore({
      name: nameDraft,
      headline: headlineDraft,
      bio: bioDraft,
      contactEmail: profile.contactEmail,
      targetRoles: profile.targetRoles,
      portfolioLinks: profile.portfolioLinks
    });

    const userResult = await supabase
      .from("users")
      .update({
        name: nameDraft,
        role_type: roleTypeDraft,
        headline: headlineDraft
      })
      .eq("user_id", userId);

    if (userResult.error) {
      setIdentityError(userResult.error.message);
      setIdentitySaving(false);
      return;
    }

    const profileResult = await supabase.from("candidate_profiles").upsert(
      {
        user_id: userId,
        bio: bioDraft,
        contact_email: profile.contactEmail || null,
        portfolio_links: profile.portfolioLinks,
        profile_completion_score: parsedScore
      },
      { onConflict: "user_id" }
    );

    if (profileResult.error) {
      setIdentityError(profileResult.error.message);
      setIdentitySaving(false);
      return;
    }

    setProfile((current) => ({
      ...current,
      name: nameDraft,
      roleType: roleTypeDraft,
      headline: headlineDraft,
      bio: bioDraft,
      profileCompletionScore: parsedScore
    }));
    setIdentitySuccess("Identity updated.");
    setIdentitySaving(false);
    router.refresh();
  };

  const savePassport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);

    const parsedTargetRoles = parseCommaSeparatedInput(targetRolesDraft);
    const parsedPortfolioLinks = parseLineSeparatedInput(portfolioLinksDraft);
    const normalizedCvLink = cvLinkDraft.trim();
    const portfolioLinksWithCv = normalizedCvLink
      ? [normalizedCvLink, ...parsedPortfolioLinks]
      : parsedPortfolioLinks;
    const dedupedPortfolioLinks = Array.from(new Set(portfolioLinksWithCv));

    const parsedScore = calculateProfileCompletionScore({
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      contactEmail: contactEmailDraft,
      targetRoles: parsedTargetRoles,
      portfolioLinks: dedupedPortfolioLinks
    });

    const supabase = createBrowserSupabaseClient();

    const userResult = await supabase
      .from("users")
      .update({
        target_roles: parsedTargetRoles
      })
      .eq("user_id", userId);

    if (userResult.error) {
      setPassportError(userResult.error.message);
      setPassportSaving(false);
      return;
    }

    const profileResult = await supabase.from("candidate_profiles").upsert(
      {
        user_id: userId,
        bio: profile.bio,
        contact_email: contactEmailDraft || null,
        portfolio_links: dedupedPortfolioLinks,
        profile_completion_score: parsedScore
      },
      { onConflict: "user_id" }
    );

    if (profileResult.error) {
      setPassportError(profileResult.error.message);
      setPassportSaving(false);
      return;
    }

    setProfile((current) => ({
      ...current,
      contactEmail: contactEmailDraft,
      targetRoles: parsedTargetRoles,
      portfolioLinks: dedupedPortfolioLinks,
      profileCompletionScore: parsedScore
    }));
    setPassportSuccess("Passport updated.");
    setPassportSaving(false);
    router.refresh();
  };

  const renderSection = () => {
    if (activeSection === "projects") {
      return (
        <section className="space-y-4" id="section-projects">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Published projects</h2>
            <Link href="/projects/new">
              <Button>Add project</Button>
            </Link>
          </div>
          <ProjectRail
            emptyText="You do not have projects yet. Publish one to activate your passport."
            projectActions={(project) => <ProjectOwnerActions projectId={project.projectId} />}
            projects={ownProjects}
          />
        </section>
      );
    }

    if (activeSection === "passport") {
      return (
        <section className="space-y-4" id="section-passport">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Passport snapshot</h2>
            <Button onClick={openPassportEditor} variant="secondary">
              Edit passport
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-2 border-sun-200">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Readiness</p>
              <p className="text-3xl font-semibold text-ink-950">{profile.profileCompletionScore}%</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Identity</p>
              <p className="text-base font-semibold text-ink-950 capitalize">{profile.roleType}</p>
              <p className="text-sm text-ink-700">{profile.headline || "Add a headline in identity settings."}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Target roles</p>
              {profile.targetRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.targetRoles.map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-700">No target roles added yet.</p>
              )}
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Contact</p>
              <p className="text-sm text-ink-800">{profile.contactEmail || "No contact email set."}</p>
              <Link className="text-sm font-semibold text-ink-900 underline underline-offset-2" href={`/c/${userId}`}>
                View public passport
              </Link>
            </Card>
          </div>
        </section>
      );
    }

    if (activeSection === "portfolio") {
      return (
        <section className="space-y-4" id="section-portfolio">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Embedded portfolio</h2>
            <Button onClick={openPassportEditor} variant="secondary">
              Manage links
            </Button>
          </div>
          {profile.portfolioLinks.length === 0 ? (
            <Card className="space-y-3">
              <p className="text-sm text-ink-700">
                Add Framer, GitHub Pages, Behance, Notion, or personal site links to power this embedded space.
              </p>
              <div>
                <Button onClick={openPassportEditor}>Add portfolio links</Button>
              </div>
            </Card>
          ) : (
            <>
              <Card className="space-y-3">
                <p className="text-sm text-ink-700">Choose a source to preview inside your profile.</p>
                <div className="flex flex-wrap gap-2">
                  {profile.portfolioLinks.map((link) => (
                    <button
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedPortfolioLink === link
                          ? "border-sun-400 bg-sun-100 text-ink-950"
                          : "border-ink-200 bg-white text-ink-700 hover:border-sun-300 hover:bg-sun-50"
                      }`}
                      key={link}
                      onClick={() => setSelectedPortfolioLink(link)}
                      type="button"
                    >
                      {toPortfolioLabel(link)}
                    </button>
                  ))}
                </div>
              </Card>
              <Card className="space-y-4 p-0">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                  <p className="text-sm font-semibold text-ink-900">{toPortfolioLabel(selectedPortfolioLink)}</p>
                  <a
                    className="text-sm font-semibold text-ink-900 underline underline-offset-2"
                    href={selectedPortfolioLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open in new tab
                  </a>
                </div>
                <div className="aspect-[16/9] bg-ink-100">
                  {!portfolioEmbedFailed && selectedPortfolioLink ? (
                    <iframe
                      className="h-full w-full bg-white"
                      loading="lazy"
                      onError={() => setPortfolioEmbedFailed(true)}
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                      src={selectedPortfolioLink}
                      title="Portfolio preview"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-700">
                      This site blocks embedding. Open it in a new tab while keeping your link here as part of your
                      integrated portfolio stack.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </section>
      );
    }

    if (activeSection === "cv") {
      const cvLink = findCvLink(profile.portfolioLinks);

      return (
        <section className="space-y-4" id="section-cv">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">CV / Resume</h2>
            <Button onClick={openPassportEditor} variant="secondary">
              Edit CV link
            </Button>
          </div>
          {!cvLink ? (
            <Card className="space-y-3">
              <p className="text-sm text-ink-700">
                No CV link set yet. Add your resume URL (PDF, Notion, Google Doc, etc.) to this tab.
              </p>
              <div>
                <Button onClick={openPassportEditor}>Add CV link</Button>
              </div>
            </Card>
          ) : (
            <Card className="space-y-4 p-0">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">Current CV</p>
                <a
                  className="text-sm font-semibold text-ink-900 underline underline-offset-2"
                  href={cvLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open in new tab
                </a>
              </div>
              <div className="aspect-[4/3] bg-ink-100">
                {!cvEmbedFailed ? (
                  <iframe
                    className="h-full w-full bg-white"
                    loading="lazy"
                    onError={() => setCvEmbedFailed(true)}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    src={cvLink}
                    title="CV preview"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-700">
                    This CV link does not support embedding. Use the open button to view it in a new tab.
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>
      );
    }

    if (activeSection === "activity") {
      return (
        <section className="space-y-4" id="section-activity">
          <h2 className="text-xl font-semibold text-ink-950">Activity</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Published</p>
              <p className="text-3xl font-semibold text-ink-950">{ownProjects.length}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Saved</p>
              <p className="text-3xl font-semibold text-ink-950">{savedProjects.length}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Liked</p>
              <p className="text-3xl font-semibold text-ink-950">{inspiredProjectIds.length}</p>
            </Card>
          </div>
          <Card className="space-y-3">
            <h3 className="text-base font-semibold text-ink-950">Recent publishing timeline</h3>
            {activityTimeline.length === 0 ? (
              <p className="text-sm text-ink-700">No publishing activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activityTimeline.map((project) => (
                  <div className="flex items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0" key={project.projectId}>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{project.title}</p>
                      <p className="text-sm text-ink-700">{project.hook || project.category}</p>
                    </div>
                    <p className="text-xs text-ink-600">{formatCreatedDate(project.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      );
    }

    if (activeSection === "skills") {
      return (
        <section className="space-y-4" id="section-skills">
          <h2 className="text-xl font-semibold text-ink-950">Skills backed by project evidence</h2>
          {skillStats.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">
                Add skills to project entries so recruiters can quickly understand your strengths.
              </p>
            </Card>
          ) : (
            <Card className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {skillStats.map(({ skill, count }) => (
                  <Badge className="text-sm" key={skill}>
                    {skill} x{count}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-ink-700">
                Skills are ranked by how often they appear across your published builds.
              </p>
            </Card>
          )}
        </section>
      );
    }

    return (
      <section className="space-y-4" id="section-saved">
        <h2 className="text-xl font-semibold text-ink-950">Saved projects</h2>
        <ProjectRail
          emptyText="You have not saved any projects yet."
          projectActions={(project) => (
            <ProjectInteractions
              initialInspired={inspiredIdSet.has(project.projectId)}
              initialSaved={savedIdSet.has(project.projectId)}
              projectId={project.projectId}
            />
          )}
          projects={savedProjects}
        />
      </section>
    );
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-4 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-600">Passport</p>
              <h1 className="text-3xl font-semibold text-ink-950">{profile.name || "Merit Builder"}</h1>
              <p className="text-sm text-ink-700">{profile.headline || "Add a headline to define your identity."}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="capitalize">{profile.roleType}</Badge>
                <Badge>{ownProjects.length} projects</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openIdentityEditor} variant="secondary">
                Edit identity
              </Button>
              <Button onClick={openPassportEditor} variant="secondary">
                Edit passport
              </Button>
            </div>
          </div>

          {featuredProject ? (
            <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-ink-100">
                <div className="aspect-[4/3] bg-ink-100">
                  {featuredVisual?.previewUrl ? (
                    <img
                      alt={`${featuredProject.title} preview`}
                      className="h-full w-full object-cover"
                      src={featuredVisual.previewUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-600">
                      Preview unavailable
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Featured build</p>
                <h2 className="text-xl font-semibold text-ink-950">{featuredProject.title}</h2>
                <p className="text-sm text-ink-700">{featuredProject.hook || featuredProject.problemSolved}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/projects/${featuredProject.projectId}`}>
                    <Button variant="secondary">Open project</Button>
                  </Link>
                  <Link href={`/c/${userId}`}>
                    <Button variant="secondary">Public passport</Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white/70 p-4">
              <p className="text-sm text-ink-700">
                Publish your first project to activate the featured proof section.
              </p>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Readiness snapshot</p>
          <p className="text-4xl font-semibold text-ink-950">{profile.profileCompletionScore}%</p>
          <p className="text-sm text-ink-700">
            Profile readiness is based on identity, contact, role intent, portfolio links, and project evidence.
          </p>
          <Link href={`/c/${userId}`}>
            <Button className="w-full" variant="secondary">
              View passport as recruiters
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="p-3">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {sections.map((section) => (
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === section.id
                    ? "bg-sun-100 text-ink-950"
                    : "bg-white text-ink-700 hover:bg-sun-50 hover:text-ink-900"
                }`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      </Card>

      {renderSection()}

      <ProfileModal onClose={() => setIdentityModalOpen(false)} open={identityModalOpen} title="Edit identity">
        <form className="space-y-4" onSubmit={saveIdentity}>
          <label className="block space-y-2 text-sm text-ink-900">
            Name
            <Input onChange={(event) => setNameDraft(event.target.value)} required value={nameDraft} />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Role
            <select
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white focus:border-sun-400 focus:ring-4 focus:ring-sun-100"
              onChange={(event) => setRoleTypeDraft(event.target.value as ProfileRoleType)}
              value={roleTypeDraft}
            >
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Headline
            <Input
              onChange={(event) => setHeadlineDraft(event.target.value)}
              placeholder="Builder identity in one sentence"
              value={headlineDraft}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Bio
            <Textarea
              onChange={(event) => setBioDraft(event.target.value)}
              placeholder="What you build and why"
              value={bioDraft}
            />
          </label>
          {identityError ? <p className="text-sm text-red-700">{identityError}</p> : null}
          {identitySuccess ? <p className="text-sm text-green-700">{identitySuccess}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setIdentityModalOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={identitySaving} type="submit">
              {identitySaving ? "Saving..." : "Save identity"}
            </Button>
          </div>
        </form>
      </ProfileModal>

      <ProfileModal onClose={() => setPassportModalOpen(false)} open={passportModalOpen} title="Edit passport">
        <form className="space-y-4" onSubmit={savePassport}>
          <label className="block space-y-2 text-sm text-ink-900">
            Contact email
            <Input
              onChange={(event) => setContactEmailDraft(event.target.value)}
              type="email"
              value={contactEmailDraft}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Target roles (comma separated)
            <Input
              onChange={(event) => setTargetRolesDraft(event.target.value)}
              placeholder="Frontend Engineer Intern, Product Designer"
              value={targetRolesDraft}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            CV link
            <Input
              onChange={(event) => setCvLinkDraft(event.target.value)}
              placeholder="https://your-site.com/resume.pdf"
              value={cvLinkDraft}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Portfolio links (one URL per line)
            <Textarea
              onChange={(event) => setPortfolioLinksDraft(event.target.value)}
              placeholder={"https://your-site.com\nhttps://behance.net/you"}
              value={portfolioLinksDraft}
            />
          </label>
          {passportError ? <p className="text-sm text-red-700">{passportError}</p> : null}
          {passportSuccess ? <p className="text-sm text-green-700">{passportSuccess}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setPassportModalOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={passportSaving} type="submit">
              {passportSaving ? "Saving..." : "Save passport"}
            </Button>
          </div>
        </form>
      </ProfileModal>
    </section>
  );
}
