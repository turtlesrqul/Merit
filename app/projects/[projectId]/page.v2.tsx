/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectInteractions } from "@/components/projects/project-interactions";
import { ProjectPreviewPlayer } from "@/components/projects/project-preview-player";
import { ProjectReportButton } from "@/components/projects/project-report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
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

  return (
    <AppShell roleType={viewerProfile?.roleType} userEmail={user?.email}>
      <section className="space-y-6">
        <Card className="space-y-3 border-sun-200 bg-gradient-to-r from-sun-50 to-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-600">Project</p>
              <h1 className="text-3xl font-semibold text-ink-950">{project.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{projectTypeLabel(project.projectType)}</Badge>
              <Badge>{project.category || "Project"}</Badge>
              {project.feedLabel ? <Badge className="bg-ink-900 text-white">{project.feedLabel}</Badge> : null}
            </div>
          </div>
          <p className="text-base text-ink-800">{project.hook}</p>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <ProjectPreviewPlayer
              artifacts={project.artifacts}
              coverImageUrl={project.coverImageUrl}
              mode="inline"
              projectType={project.projectType}
              title={project.title}
            />

            <Card className="space-y-4 border-ink-100">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-ink-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Views</p>
                  <p className="text-xl font-semibold text-ink-950">{project.engagement.views}</p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Likes</p>
                  <p className="text-xl font-semibold text-ink-950">{project.engagement.likes}</p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Saves</p>
                  <p className="text-xl font-semibold text-ink-950">{project.engagement.saves}</p>
                </div>
              </div>
              {user ? (
                <ProjectInteractions
                  initialInspired={interactionState.inspiredProjectIds.includes(project.projectId)}
                  initialSaved={interactionState.savedProjectIds.includes(project.projectId)}
                  projectId={project.projectId}
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-ink-700">Sign in to like or save this project.</p>
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
            </Card>

            <Card className="space-y-3 border-ink-100">
              <h2 className="text-lg font-semibold text-ink-950">Overview</h2>
              <p className="text-sm text-ink-700">{project.whatWasBuilt || "No short description added yet."}</p>
              {project.problemSolved ? (
                <p className="text-sm text-ink-700">
                  <span className="font-semibold text-ink-900">Problem solved:</span> {project.problemSolved}
                </p>
              ) : null}
              {project.impact ? (
                <p className="text-sm text-ink-700">
                  <span className="font-semibold text-ink-900">Impact:</span> {project.impact}
                </p>
              ) : null}
              {project.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <Badge key={`${project.projectId}-${skill}`}>{skill}</Badge>
                  ))}
                </div>
              ) : null}
            </Card>

            {project.artifacts.length > 0 ? (
              <Card className="space-y-3 border-ink-100">
                <h2 className="text-lg font-semibold text-ink-950">Project assets</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.artifacts.map((artifact) => (
                    <a
                      className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 hover:bg-sun-50"
                      href={artifact.url}
                      key={`${project.projectId}-${artifact.url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-md bg-ink-100">
                        {artifact.previewUrl ? (
                          <img alt={artifact.label} className="h-full w-full object-cover" src={artifact.previewUrl} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-ink-500">No preview</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">{artifact.label}</p>
                        <p className="text-xs capitalize text-ink-600">{artifact.type}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card className="space-y-3 border-ink-100">
              <h2 className="text-base font-semibold text-ink-950">Creator</h2>
              <p className="text-sm font-semibold text-ink-900">{project.authorName ?? "Merit User"}</p>
              {project.authorHeadline ? <p className="text-sm text-ink-700">{project.authorHeadline}</p> : null}
              <Link href={`/c/${project.userId}`}>
                <Button className="w-full" variant="secondary">
                  View Passport
                </Button>
              </Link>
            </Card>

            {primaryLink ? (
              <Card className="space-y-3 border-ink-100">
                <h2 className="text-base font-semibold text-ink-950">Visit project</h2>
                <a href={primaryLink} rel="noreferrer" target="_blank">
                  <Button className="w-full">Open external link</Button>
                </a>
              </Card>
            ) : null}

            {user && project.userId === user.id ? (
              <Card className="space-y-3 border-ink-100">
                <h2 className="text-base font-semibold text-ink-950">Owner actions</h2>
                <Link href={`/projects/${project.projectId}/edit`}>
                  <Button className="w-full" variant="secondary">
                    Edit project
                  </Button>
                </Link>
              </Card>
            ) : null}
            {user && project.userId !== user.id ? (
              <Card className="space-y-3 border-ink-100">
                <h2 className="text-base font-semibold text-ink-950">Safety</h2>
                <ProjectReportButton projectId={project.projectId} />
              </Card>
            ) : null}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
