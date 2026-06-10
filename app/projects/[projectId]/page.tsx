/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { ProjectPreviewPlayer } from "@/components/projects/project-preview-player";
import { ProjectReportButton } from "@/components/projects/project-report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionIcon, iconControlClassName } from "@/components/ui/action-icon";
import { resolveProjectVisualPreview } from "@/lib/artifacts";
import { getViewerProfile } from "@/lib/db/profile";
import {
  fetchProjectById,
  fetchSavedInteractionState,
  recordProjectView
} from "@/lib/db/projects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    from?: string;
  }>;
};

function projectTypeLabel(value: "web" | "design" | "document" | "other") {
  if (value === "web") return "Web App / Website";
  if (value === "design") return "Design / Visual";
  if (value === "document") return "Deck / Document";
  return "Other";
}

function getPrimaryLink(projectArtifacts: Array<{ type: string; url: string }>) {
  const websiteArtifact = projectArtifacts.find((artifact) => artifact.type === "website");
  if (websiteArtifact) {
    return websiteArtifact.url;
  }
  return projectArtifacts[0]?.url ?? null;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const source = await searchParams;
  const supabase = await createServerSupabaseClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const {
      data: { user: resolvedUser }
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    user = null;
  }

  const initialProject = await fetchProjectById(supabase, projectId);

  if (!initialProject) {
    notFound();
  }

  let viewerProfile: Awaited<ReturnType<typeof getViewerProfile>> = null;
  let interactionState = {
    savedProjectIds: [] as string[],
    inspiredProjectIds: [] as string[]
  };

  if (user) {
    [viewerProfile, interactionState] = await Promise.all([
      getViewerProfile(supabase, user.id),
      fetchSavedInteractionState(supabase, user.id)
    ]);
  }

  if (user && initialProject.userId !== user.id) {
    await recordProjectView(supabase, user.id, initialProject.projectId);
  }
  const project = user ? (await fetchProjectById(supabase, projectId)) ?? initialProject : initialProject;
  const primaryLink = getPrimaryLink(project.artifacts);
  const visual = resolveProjectVisualPreview({
    artifacts: project.artifacts,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType
  });
  const backHref = source?.from === "explore" ? "/home" : `/c/${project.userId}`;
  const backLabel = source?.from === "explore" ? "Back to Explore" : `Back to ${project.authorName ?? "builder"}'s profile`;

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <article className="editorial-container pt-12">
        <Link
          aria-label={backLabel}
          className="inline-flex items-center gap-2 text-sm text-[#16130f] hover:text-[#7b705f]"
          href={backHref}
          title={backLabel}
        >
          <ActionIcon name="arrow-left" />
          <span>{backLabel}</span>
        </Link>

        <header className="mt-8 space-y-5">
          <div className="max-w-4xl space-y-4">
            <h1 className="font-serif text-3xl leading-[1.06] text-[#16130f] sm:text-4xl lg:text-5xl">
              {project.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[#7b705f]">{project.hook}</p>
          </div>

          <div className="grid gap-5 border-y border-[#d7cebd] py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="label-caps">Category</p>
              <p className="mt-1.5 text-sm text-[#16130f]">{project.category || projectTypeLabel(project.projectType)}</p>
            </div>
            <div>
              <p className="label-caps">Year</p>
              <p className="mt-1.5 text-sm text-[#16130f]">{new Date(project.createdAt).getFullYear()}</p>
            </div>
            <div>
              <p className="label-caps">Role</p>
              <p className="mt-1.5 text-sm text-[#16130f]">{project.authorName ? `Built by ${project.authorName}` : "Builder"}</p>
            </div>
            <div>
              <p className="label-caps">Proof</p>
              <p className="mt-1.5 text-sm text-[#16130f]">{project.artifacts.length} asset{project.artifacts.length === 1 ? "" : "s"}</p>
            </div>
          </div>
        </header>

        <div className="mt-8 overflow-hidden">
          {visual.previewUrl ? (
            <img
              alt={`${project.title} preview`}
              className="mx-auto max-h-[520px] max-w-full object-contain"
              src={visual.previewUrl}
            />
          ) : (
            <div className="flex min-h-64 items-center justify-center bg-[#e5ded1] text-[#7b705f]">Preview coming soon</div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-7">
            <section className="max-w-3xl space-y-4">
              <p className="label-caps">Overview</p>
              <p className="text-base leading-7 text-[#4b4439]">{project.whatWasBuilt || "No detailed overview has been added yet."}</p>
              {project.problemSolved ? (
                <p className="text-base leading-7 text-[#7b705f]">
                  <span className="text-[#16130f]">Problem: </span>
                  {project.problemSolved}
                </p>
              ) : null}
              {project.impact ? (
                <p className="text-base leading-7 text-[#7b705f]">
                  <span className="text-[#16130f]">Outcome: </span>
                  {project.impact}
                </p>
              ) : null}
            </section>

            {project.skills.length > 0 ? (
              <section className="space-y-5">
                <p className="label-caps">Tools and skills</p>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
              </section>
            ) : null}

            {project.artifacts.length > 0 ? (
              <section className="space-y-6">
                <p className="label-caps">Gallery and assets</p>
                <ProjectPreviewPlayer
                  artifacts={project.artifacts}
                  coverImageUrl={project.coverImageUrl}
                  mode="inline"
                  projectType={project.projectType}
                  title={project.title}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.artifacts.map((artifact) => (
                    <a
                      className="border border-[#d7cebd] bg-[#eee8dd] p-4 text-sm text-[#16130f] hover:bg-[#ebe3d6]"
                      href={artifact.url}
                      key={`${project.projectId}-${artifact.url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="block truncate">{artifact.label}</span>
                      <span className="mt-1 block text-xs capitalize text-[#7b705f]">{artifact.type}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 border-t border-[#d7cebd] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="space-y-2">
              <p className="label-caps">Creator</p>
              <p className="text-base text-[#16130f]">{project.authorName ?? "Merit User"}</p>
              {project.authorHeadline ? <p className="text-sm leading-6 text-[#7b705f]">{project.authorHeadline}</p> : null}
              <Link
                aria-label="View creator profile"
                className={iconControlClassName({ className: "mt-3" })}
                href={`/c/${project.userId}`}
                title="View creator profile"
              >
                <ActionIcon name="eye" />
              </Link>
            </div>

            {primaryLink ? (
              <a
                aria-label="Open external project link"
                className={iconControlClassName({ variant: "primary" })}
                href={primaryLink}
                rel="noreferrer"
                target="_blank"
                title="Open external project link"
              >
                <ActionIcon name="external" />
              </a>
            ) : null}

            {user ? (
              <ProjectInteractions
                initialInspired={interactionState.inspiredProjectIds.includes(project.projectId)}
                initialSaved={interactionState.savedProjectIds.includes(project.projectId)}
                projectId={project.projectId}
              />
            ) : (
              <div className="space-y-3 border border-[#d7cebd] bg-[#eee8dd] p-4">
                <p className="text-sm text-[#7b705f]">Sign in to save or mark this project as inspiring.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/sign-in">
                    <Button variant="secondary">Sign in</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button>Create account</Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 border border-[#d7cebd] text-center text-sm">
              <div className="border-r border-[#d7cebd] p-3">
                <p className="label-caps">Views</p>
                <p className="mt-2 font-serif text-2xl">{project.engagement.views}</p>
              </div>
              <div className="border-r border-[#d7cebd] p-3">
                <p className="label-caps">Likes</p>
                <p className="mt-2 font-serif text-2xl">{project.engagement.likes}</p>
              </div>
              <div className="p-3">
                <p className="label-caps">Saves</p>
                <p className="mt-2 font-serif text-2xl">{project.engagement.saves}</p>
              </div>
            </div>

            {user && project.userId === user.id ? (
              <Link
                aria-label="Edit project"
                className={iconControlClassName()}
                href={`/projects/${project.projectId}/edit`}
                title="Edit project"
              >
                <ActionIcon name="pencil" />
              </Link>
            ) : null}
            {user && project.userId !== user.id ? <ProjectReportButton projectId={project.projectId} /> : null}
          </aside>
        </div>
      </article>
    </AppShell>
  );
}
