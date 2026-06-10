"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminPassportAction,
  regenerateAdminPassportClaimLinkAction,
  type AdminPassportActionState
} from "@/app/admin/passports/actions";
import { ClaimablePassportPreview } from "@/components/passports/claimable-passport-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClaimablePassport } from "@/lib/db/claimable-passports";

type PassportAdminStudioProps = {
  passports: ClaimablePassport[];
};

type ProjectDraftRow = {
  id: string;
  imageUrl: string;
};

const initialActionState: AdminPassportActionState = {
  status: "idle",
  message: null,
  claimLink: null,
  passportId: null
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: ClaimablePassport["status"]) {
  if (status === "claimed") {
    return "border-green-700 text-green-800";
  }
  if (status === "expired") {
    return "border-red-700 text-red-800";
  }
  return "border-[#16130f] text-[#16130f]";
}

export function PassportAdminStudio({ passports }: PassportAdminStudioProps) {
  const router = useRouter();
  const [createState, createFormAction, isCreating] = useActionState(
    createAdminPassportAction,
    initialActionState
  );
  const [regenerateState, regenerateFormAction, isRegenerating] = useActionState(
    regenerateAdminPassportClaimLinkAction,
    initialActionState
  );
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectDraftRow[]>([
    { id: "project-1", imageUrl: "" }
  ]);
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const latestLink = regenerateState.claimLink ?? createState.claimLink;
  const latestMessage = regenerateState.message ?? createState.message;
  const latestStatus = regenerateState.status !== "idle" ? regenerateState.status : createState.status;
  const latestPassportId = regenerateState.passportId ?? createState.passportId;

  useEffect(() => {
    if (createState.status === "success" || regenerateState.status === "success") {
      router.refresh();
    }
  }, [createState.status, regenerateState.status, router]);

  const copyLatestLink = async () => {
    if (!latestLink) {
      return;
    }
    await navigator.clipboard.writeText(latestLink);
    setCopiedLink(latestLink);
  };

  const addProjectRow = () => {
    setProjectRows((rows) => [
      ...rows,
      {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: ""
      }
    ]);
  };

  const removeProjectRow = (id: string) => {
    setProjectRows((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== id)));
  };

  const updateProjectImageUrl = (id: string, imageUrl: string) => {
    setProjectRows((rows) => rows.map((row) => (row.id === id ? { ...row, imageUrl } : row)));
  };

  const uploadProjectImage = async (id: string, file: File | null) => {
    if (!file) {
      return;
    }

    setUploadError(null);
    setUploadingProjectId(id);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/passports/project-image", {
        method: "POST",
        body: formData
      });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Failed to upload project image.");
      }
      updateProjectImageUrl(id, result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload project image.");
    } finally {
      setUploadingProjectId(null);
    }
  };

  return (
    <div className="editorial-container space-y-8 pt-10">
      <div className="space-y-3 border-b border-[#d7cebd] pb-6">
        <p className="label-caps">Internal Admin</p>
        <h1 className="font-serif text-4xl leading-tight text-[#16130f] md:text-5xl">
          Claimable Passports
        </h1>
        <p className="max-w-3xl text-base leading-7 text-[#7b705f]">
          Create unclaimed Passports, copy secure claim links, and regenerate expired links.
        </p>
      </div>

      {latestMessage ? (
        <Card className={latestStatus === "error" ? "border-red-300 bg-red-50" : "border-[#d7cebd] bg-[#fbf8f0]"}>
          <div className="space-y-3">
            <p className={latestStatus === "error" ? "text-sm text-red-700" : "text-sm text-[#4b4439]"}>
              {latestMessage}
            </p>
            {latestLink ? (
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input readOnly value={latestLink} />
                <Button onClick={copyLatestLink} type="button" variant="secondary">
                  {copiedLink === latestLink ? "Copied" : "Copy link"}
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div>
            <p className="label-caps">Create</p>
            <h2 className="mt-2 font-serif text-2xl text-[#16130f]">New unclaimed Passport</h2>
          </div>
          <form action={createFormAction} className="space-y-4">
            <label className="block space-y-2 text-sm text-[#16130f]">
              Full name
              <Input name="fullName" placeholder="Avery Tan" required />
            </label>
            <label className="block space-y-2 text-sm text-[#16130f]">
              Headline
              <Input name="headline" placeholder="Product designer building civic tools" />
            </label>
            <label className="block space-y-2 text-sm text-[#16130f]">
              Bio
              <Textarea name="bio" placeholder="Short context for the Passport owner." />
            </label>
            <label className="block space-y-2 text-sm text-[#16130f]">
              Email
              <Input name="email" placeholder="person@example.com" type="email" />
            </label>
            <label className="block space-y-2 text-sm text-[#16130f]">
              Passport skills
              <Input name="skills" placeholder="React, Figma, Research" />
            </label>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="label-caps">Projects</p>
                  <h3 className="mt-1 font-serif text-xl text-[#16130f]">Placeholder project cards</h3>
                </div>
                <Button onClick={addProjectRow} type="button" variant="secondary">
                  Add project
                </Button>
              </div>

              {uploadError ? <p className="text-sm text-red-700">{uploadError}</p> : null}

              {projectRows.map((row, index) => (
                <fieldset className="space-y-3 border border-[#d7cebd] bg-[#fbf8f0] p-4" key={row.id}>
                  <div className="flex items-center justify-between gap-3">
                    <legend className="font-serif text-lg text-[#16130f]">Project {index + 1}</legend>
                    {projectRows.length > 1 ? (
                      <Button onClick={() => removeProjectRow(row.id)} type="button" variant="ghost">
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <label className="block space-y-2 text-sm text-[#16130f]">
                    Project title
                    <Input name="projectTitle" placeholder="AI study planner" />
                  </label>
                  <label className="block space-y-2 text-sm text-[#16130f]">
                    One-liner
                    <Input name="projectHook" placeholder="A scheduling tool that turns revision goals into daily plans." />
                  </label>
                  <label className="block space-y-2 text-sm text-[#16130f]">
                    Description
                    <Textarea name="projectDescription" placeholder="What was built, why it matters, and what proof exists." />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Category
                      <Input name="projectCategory" placeholder="Web App" />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Skills/tags
                      <Input name="projectSkills" placeholder="Next.js, UX, Supabase" />
                    </label>
                  </div>
                  <label className="block space-y-2 text-sm text-[#16130f]">
                    Project link
                    <Input name="projectLink" placeholder="https://..." />
                  </label>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Project image
                      <Input
                        accept="image/*"
                        disabled={uploadingProjectId === row.id}
                        onChange={(event) => {
                          void uploadProjectImage(row.id, event.currentTarget.files?.[0] ?? null);
                        }}
                        type="file"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Image URL
                      <Input
                        name="projectImageUrl"
                        onChange={(event) => updateProjectImageUrl(row.id, event.target.value)}
                        placeholder="https://..."
                        value={row.imageUrl}
                      />
                    </label>
                  </div>
                  {row.imageUrl ? (
                    <div className="overflow-hidden border border-[#d7cebd] bg-[#e5ded1]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="" className="h-40 w-full object-cover" src={row.imageUrl} />
                    </div>
                  ) : null}
                  {uploadingProjectId === row.id ? (
                    <p className="text-sm text-[#7b705f]">Uploading image...</p>
                  ) : null}
                </fieldset>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm text-[#16130f]">
                Featured work title
                <Input name="featuredWorkTitle" placeholder="Builder Portfolio" />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Public slug
                <Input name="passportSlug" placeholder="avery-tan" />
              </label>
            </div>
            <label className="block space-y-2 text-sm text-[#16130f]">
              Featured work description
              <Textarea name="featuredWorkDescription" placeholder="What makes this work useful, original, or impressive." />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm text-[#16130f]">
                Resume link
                <Input name="resumeUrl" placeholder="https://..." />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Portfolio link
                <Input name="portfolioUrl" placeholder="https://..." />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                LinkedIn link
                <Input name="linkedinUrl" placeholder="https://..." />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                GitHub link
                <Input name="githubUrl" placeholder="https://..." />
              </label>
            </div>
            <Button disabled={isCreating || Boolean(uploadingProjectId)} type="submit">
              {isCreating ? "Creating..." : "Create Passport"}
            </Button>
          </form>
        </Card>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label-caps">Manage</p>
              <h2 className="mt-2 font-serif text-2xl text-[#16130f]">Recent Passports</h2>
            </div>
            <p className="text-sm text-[#7b705f]">{passports.length} total</p>
          </div>

          {passports.length === 0 ? (
            <Card>
              <p className="text-sm text-[#7b705f]">No claimable Passports yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {passports.map((passport) => {
                const isLatest = latestPassportId === passport.passportId;
                return (
                  <Card className="space-y-4" key={passport.passportId}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-serif text-2xl text-[#16130f]">{passport.fullName}</h3>
                        <p className="text-sm text-[#7b705f]">{passport.email || "No email set"}</p>
                        <p className="text-xs uppercase tracking-[0.12em] text-[#7b705f]">
                          Expires {formatDate(passport.claimExpiresAt)}
                        </p>
                      </div>
                      <Badge className={statusTone(passport.status)}>{passport.status}</Badge>
                    </div>

                    <details className="group">
                      <summary className="cursor-pointer list-none text-sm text-[#16130f] underline underline-offset-4">
                        Preview Passport
                      </summary>
                      <div className="mt-4 border-t border-[#d7cebd] pt-4">
                        <ClaimablePassportPreview compact passport={passport} />
                      </div>
                    </details>

                    <div className="flex flex-wrap items-center gap-3">
                      {passport.status !== "claimed" ? (
                        <form action={regenerateFormAction}>
                          <input name="passportId" type="hidden" value={passport.passportId} />
                          <Button disabled={isRegenerating} type="submit" variant="secondary">
                            {isRegenerating ? "Generating..." : "Regenerate claim link"}
                          </Button>
                        </form>
                      ) : null}
                      {isLatest && latestLink ? (
                        <a className="text-sm text-[#16130f] underline underline-offset-4" href={latestLink} rel="noreferrer" target="_blank">
                          Open latest claim preview
                        </a>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
