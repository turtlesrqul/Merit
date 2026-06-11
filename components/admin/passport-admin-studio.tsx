"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminPassportAction,
  deleteAdminPassportAction,
  regenerateAdminPassportClaimLinkAction,
  updateAdminPassportAction,
  type AdminPassportActionState
} from "@/app/admin/passports/actions";
import { ClaimablePassportPreview } from "@/components/passports/claimable-passport-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeArtifactUrl, resolveProjectVisualPreview, type ProjectType } from "@/lib/artifacts";
import type { ClaimablePassport } from "@/lib/db/claimable-passports";
import {
  buildPreparedArtifacts,
  categoryForProjectType,
  parseCommaSeparatedSkills,
  validateVisualRequirements
} from "@/lib/projects/form-validation";
import {
  artifactPlaceholder,
  artifactTips,
  projectTypeLabel
} from "@/lib/projects/project-form-copy";

type PassportAdminStudioProps = {
  passports: ClaimablePassport[];
};

const initialActionState: AdminPassportActionState = {
  status: "idle",
  message: null,
  claimLink: null,
  passportId: null
};

const CREATE_PROJECT_UPLOAD_ID = "create-project-image";
const MAX_ADMIN_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

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

function createEmptyProject(): ClaimablePassport["projects"][number] {
  return {
    title: "",
    hook: "",
    category: "Portfolio",
    description: "",
    skills: [],
    artifactUrl: null,
    imageUrl: null
  };
}

function getEditableProjects(passport: ClaimablePassport) {
  return passport.projects.length > 0 ? passport.projects : [createEmptyProject()];
}

function normalizePassportSlugDraft(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
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
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateAdminPassportAction,
    initialActionState
  );
  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    deleteAdminPassportAction,
    initialActionState
  );
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [createProjectType, setCreateProjectType] = useState<ProjectType>("web");
  const [createProjectTitle, setCreateProjectTitle] = useState("");
  const [createProjectHook, setCreateProjectHook] = useState("");
  const [createProjectDescription, setCreateProjectDescription] = useState("");
  const [createProjectSkills, setCreateProjectSkills] = useState("");
  const [createProjectLink, setCreateProjectLink] = useState("");
  const [createProjectImageUrl, setCreateProjectImageUrl] = useState("");
  const [createPassportSlug, setCreatePassportSlug] = useState("");
  const [isCreateThumbnailDragActive, setIsCreateThumbnailDragActive] = useState(false);
  const [thumbnailObjectFit, setThumbnailObjectFit] = useState<"contain" | "cover">("contain");
  const [editProjectImageUrls, setEditProjectImageUrls] = useState<Record<string, string>>({});
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const preparedCreateArtifacts = useMemo(() => buildPreparedArtifacts(createProjectLink), [createProjectLink]);
  const normalizedCreateSkillList = useMemo(
    () => Array.from(new Set(parseCommaSeparatedSkills(createProjectSkills))),
    [createProjectSkills]
  );
  const createProjectCategory = categoryForProjectType(createProjectType);
  const createVisual = useMemo(
    () =>
      resolveProjectVisualPreview({
        artifacts: preparedCreateArtifacts.map((artifact) => ({
          url: artifact.artifact_url,
          type: artifact.artifact_type,
          previewUrl: artifact.preview_url
        })),
        coverImageUrl: normalizeArtifactUrl(createProjectImageUrl) || null,
        projectType: createProjectType
      }),
    [createProjectImageUrl, createProjectType, preparedCreateArtifacts]
  );
  const latestActionState =
    deleteState.status !== "idle"
      ? deleteState
      : updateState.status !== "idle"
        ? updateState
        : regenerateState.status !== "idle"
          ? regenerateState
          : createState.status !== "idle"
            ? createState
            : initialActionState;
  const latestLink = latestActionState.claimLink;
  const latestMessage = latestActionState.message;
  const latestStatus = latestActionState.status;
  const latestPassportId = latestActionState.passportId;

  useEffect(() => {
    if (
      createState.status === "success" ||
      regenerateState.status === "success" ||
      updateState.status === "success" ||
      deleteState.status === "success"
    ) {
      router.refresh();
    }
  }, [createState.status, deleteState.status, regenerateState.status, router, updateState.status]);

  const copyLatestLink = async () => {
    if (!latestLink) {
      return;
    }
    await navigator.clipboard.writeText(latestLink);
    setCopiedLink(latestLink);
  };

  const updateEditProjectImageUrl = (id: string, imageUrl: string) => {
    setEditProjectImageUrls((urls) => ({
      ...urls,
      [id]: imageUrl
    }));
  };

  const resolveEditProjectImageUrl = (id: string, fallback: string | null) =>
    editProjectImageUrls[id] ?? fallback ?? "";

  const uploadCreateProjectImage = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Thumbnail upload only supports image files.");
      return;
    }
    if (file.size > MAX_ADMIN_IMAGE_UPLOAD_BYTES) {
      setUploadError("Thumbnail image must be 10MB or smaller.");
      return;
    }

    setUploadError(null);
    setUploadingProjectId(CREATE_PROJECT_UPLOAD_ID);
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
      setCreateProjectImageUrl(result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload project image.");
    } finally {
      setUploadingProjectId(null);
    }
  };

  const handleCreateThumbnailInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await uploadCreateProjectImage(event.currentTarget.files?.[0] ?? null);
    event.currentTarget.value = "";
  };

  const handleCreateThumbnailDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsCreateThumbnailDragActive(false);
    await uploadCreateProjectImage(event.dataTransfer.files?.[0] ?? null);
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (uploadingProjectId) {
      event.preventDefault();
      setUploadError("Please wait for image uploads to finish before creating the claim link.");
      return;
    }

    const visualValidationMessage = validateVisualRequirements({
      preparedArtifacts: preparedCreateArtifacts,
      coverImageUrl: normalizeArtifactUrl(createProjectImageUrl)
    });
    if (visualValidationMessage) {
      event.preventDefault();
      setUploadError(visualValidationMessage);
      return;
    }
    setUploadError(null);
  };

  const uploadEditProjectImage = async (id: string, file: File | null) => {
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
      updateEditProjectImageUrl(id, result.url);
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

      <div className="space-y-8">
        <form action={createFormAction} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleCreateSubmit}>
          <input name="projectCategory" type="hidden" value={createProjectCategory} />
          <input name="featuredWorkTitle" type="hidden" value={createProjectTitle || "Featured project"} />
          <input name="featuredWorkDescription" type="hidden" value={createProjectHook || createProjectDescription} />
          <input name="skills" type="hidden" value={createProjectSkills} />

          <div className="space-y-4">
            <Card className="bg-transparent">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl space-y-3">
                  <p className="label-caps">Project editor</p>
                  <h2 className="font-serif text-3xl leading-none text-[#16130f]">Create claimable Passport</h2>
                  <p className="text-sm leading-6 text-[#7b705f]">
                    Build the placeholder project like a normal Merit project, then generate a private claim link.
                  </p>
                </div>
                <div className="border border-[#d7cebd] bg-[#eee8dd] px-4 py-3 text-sm text-[#7b705f]">
                  Claim links expire in 3 days
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Choose project type</h3>
                <p className="mt-2 text-sm text-[#7b705f]">Pick the format that best describes the main deliverable.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["web", "design", "document", "other"] as const).map((type) => (
                  <label
                    className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-sm ${
                      createProjectType === type
                        ? "border-[#f3c945] bg-[#f3c945] text-[#16130f]"
                        : "border-[#16130f] text-[#16130f]"
                    }`}
                    key={type}
                  >
                    <span>{projectTypeLabel(type)}</span>
                    <input
                      checked={createProjectType === type}
                      className="h-4 w-4"
                      onChange={() => setCreateProjectType(type)}
                      type="radio"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Add main content</h3>
                <p className="mt-2 text-sm text-[#7b705f]">Paste a project link and add a reliable visual thumbnail.</p>
              </div>
              <div className="border border-[#d7cebd] bg-[#f4f0e8] px-4 py-3">
                <p className="label-caps">In-Merit viewer tips</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#7b705f]">
                  {artifactTips(createProjectType).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>

              <label className="block space-y-2 text-sm text-[#16130f]">
                Project link
                <Input
                  name="projectLink"
                  onChange={(event) => setCreateProjectLink(event.target.value)}
                  placeholder={artifactPlaceholder(createProjectType).split("\n")[0]}
                  value={createProjectLink}
                />
              </label>

              <input
                accept="image/*"
                className="hidden"
                disabled={uploadingProjectId === CREATE_PROJECT_UPLOAD_ID}
                onChange={handleCreateThumbnailInputChange}
                ref={thumbnailInputRef}
                type="file"
              />
              <div
                className={`border border-dashed p-4 transition-all ${
                  isCreateThumbnailDragActive
                    ? "border-[#f3c945] bg-[#f7edcf]"
                    : "border-[#d7cebd] bg-[#f4f0e8]"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsCreateThumbnailDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsCreateThumbnailDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsCreateThumbnailDragActive(true);
                }}
                onDrop={handleCreateThumbnailDrop}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#16130f]">Drop thumbnail image here</p>
                    <p className="text-xs leading-5 text-[#7b705f]">PNG, JPG, or WebP under 10MB.</p>
                  </div>
                  <Button
                    disabled={uploadingProjectId === CREATE_PROJECT_UPLOAD_ID}
                    onClick={() => thumbnailInputRef.current?.click()}
                    type="button"
                    variant="secondary"
                  >
                    {uploadingProjectId === CREATE_PROJECT_UPLOAD_ID ? "Uploading..." : "Choose image"}
                  </Button>
                </div>
              </div>

              <label className="block space-y-2 text-sm text-[#16130f]">
                Image URL
                <Input
                  name="projectImageUrl"
                  onChange={(event) => setCreateProjectImageUrl(event.target.value)}
                  placeholder="https://..."
                  value={createProjectImageUrl}
                />
              </label>

              {createProjectImageUrl.trim() ? (
                <div className="space-y-2">
                  <div className="max-w-sm overflow-hidden border border-[#d7cebd] bg-[#e5ded1]">
                    <div className="aspect-[16/9]">
                      <img
                        alt="Selected thumbnail preview"
                        className={`h-full w-full ${thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                        src={createProjectImageUrl}
                      />
                    </div>
                  </div>
                  <div className="inline-flex overflow-hidden border border-[#d7cebd]">
                    <button
                      className={`px-3 py-1.5 text-xs font-semibold transition ${
                        thumbnailObjectFit === "contain" ? "bg-[#f3c945] text-[#16130f]" : "bg-[#fbf8f0] text-[#7b705f]"
                      }`}
                      onClick={() => setThumbnailObjectFit("contain")}
                      type="button"
                    >
                      Fit contain
                    </button>
                    <button
                      className={`border-l border-[#d7cebd] px-3 py-1.5 text-xs font-semibold transition ${
                        thumbnailObjectFit === "cover" ? "bg-[#f3c945] text-[#16130f]" : "bg-[#fbf8f0] text-[#7b705f]"
                      }`}
                      onClick={() => setThumbnailObjectFit("cover")}
                      type="button"
                    >
                      Fit cover
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Title and story</h3>
                <p className="mt-2 text-sm text-[#7b705f]">Keep the project concise and scannable for the claim preview.</p>
              </div>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Project title
                <Input
                  maxLength={120}
                  name="projectTitle"
                  onChange={(event) => setCreateProjectTitle(event.target.value)}
                  placeholder="AI study planner"
                  required
                  value={createProjectTitle}
                />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                One-line hook
                <Input
                  maxLength={140}
                  name="projectHook"
                  onChange={(event) => setCreateProjectHook(event.target.value)}
                  placeholder="What was built and why does it matter?"
                  required
                  value={createProjectHook}
                />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Short description
                <Textarea
                  className="min-h-[120px]"
                  name="projectDescription"
                  onChange={(event) => setCreateProjectDescription(event.target.value)}
                  placeholder="How it works, the person's role, and what makes it compelling."
                  value={createProjectDescription}
                />
              </label>
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Skills</h3>
                <p className="mt-2 text-sm text-[#7b705f]">These become both Passport capabilities and project tags.</p>
              </div>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Skill tags (comma separated)
                <Input
                  name="projectSkills"
                  onChange={(event) => setCreateProjectSkills(event.target.value)}
                  placeholder="next.js, figma, reliability engineering"
                  value={createProjectSkills}
                />
              </label>
              {normalizedCreateSkillList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {normalizedCreateSkillList.slice(0, 10).map((skill) => (
                    <span
                      className="border border-[#f3c945] bg-[#fbf8f0] px-2.5 py-1 text-xs font-medium text-[#7b705f]"
                      key={skill}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Passport owner</h3>
                <p className="mt-2 text-sm text-[#7b705f]">Set the public identity and optional path before generating the claim link.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2 text-sm text-[#16130f]">
                  Passport/person name
                  <Input name="fullName" placeholder="Avery Tan" required />
                </label>
                <label className="block space-y-2 text-sm text-[#16130f]">
                  Email
                  <Input name="email" placeholder="person@example.com" type="email" />
                </label>
              </div>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Headline
                <Input name="headline" placeholder="Product designer building civic tools" />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Bio
                <Textarea className="min-h-[120px]" name="bio" placeholder="Short context for the Passport owner." />
              </label>
              <label className="block space-y-2 text-sm text-[#16130f]">
                Public Passport path
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="border border-[#d7cebd] bg-[#eee8dd] px-3 py-2 text-sm text-[#7b705f]">
                    /passport/
                  </span>
                  <Input
                    maxLength={40}
                    minLength={3}
                    name="passportSlug"
                    onChange={(event) => setCreatePassportSlug(normalizePassportSlugDraft(event.target.value))}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    placeholder="avery-tan"
                    title="Use 3-40 lowercase letters, numbers, and hyphens. No spaces or special characters."
                    value={createPassportSlug}
                  />
                </div>
              </label>
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl text-[#16130f]">Optional links</h3>
                <p className="mt-2 text-sm text-[#7b705f]">These carry into the claimed Passport profile.</p>
              </div>
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
            </Card>

            <Card className="space-y-3">
              {uploadError ? <p className="text-sm text-red-700">{uploadError}</p> : null}
              <Button className="w-full sm:w-auto" disabled={isCreating || Boolean(uploadingProjectId)} type="submit">
                {uploadingProjectId
                  ? "Uploading image..."
                  : isCreating
                    ? "Creating claim link..."
                    : "Create claimable Passport"}
              </Button>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-[#d7cebd] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b705f]">Project Card Preview</p>
              </div>
              <div className="space-y-4 p-4">
                <div className="overflow-hidden border border-[#d7cebd]">
                  <div className="aspect-[16/9] bg-[#e5ded1]">
                    {createVisual.previewUrl ? (
                      <img
                        alt={`Preview for ${createProjectTitle || "project"}`}
                        className={`h-full w-full ${
                          createVisual.source === "cover"
                            ? thumbnailObjectFit === "cover"
                              ? "object-cover"
                              : "object-contain p-2"
                            : "object-cover"
                        }`}
                        src={createVisual.previewUrl}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#7b705f]">
                        Add a project link or cover image
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-[#16130f]">{createProjectTitle || "Untitled Project"}</p>
                  <p className="text-sm text-[#7b705f]">{createProjectHook || "Your one-line hook appears here."}</p>
                  <p className="text-xs text-[#7b705f]">{projectTypeLabel(createProjectType)}</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-3 border-[#d7cebd] bg-[#fbf8f0]">
              <p className="text-sm font-semibold text-[#16130f]">Checklist</p>
              <p className="text-sm text-[#7b705f]">{createProjectTitle.trim() ? "Done" : "Missing"} project title</p>
              <p className="text-sm text-[#7b705f]">{createProjectHook.trim() ? "Done" : "Missing"} one-line hook</p>
              <p className="text-sm text-[#7b705f]">
                {preparedCreateArtifacts.length > 0 || createProjectImageUrl.trim() ? "Done" : "Missing"} visual source
              </p>
              <p className="text-sm text-[#7b705f]">{createPassportSlug.trim() ? "Set" : "Optional"} public path</p>
              <p className="text-sm text-[#7b705f]">Claim link expires after 3 days</p>
            </Card>
          </aside>
        </form>

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
                const canManage = passport.status !== "claimed";
                const editableProjects = getEditableProjects(passport);
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

                    {canManage ? (
                      <details className="group border-t border-[#d7cebd] pt-4">
                        <summary className="cursor-pointer list-none text-sm text-[#16130f] underline underline-offset-4">
                          Edit details
                        </summary>
                        <form action={updateFormAction} className="mt-4 space-y-4">
                          <input name="passportId" type="hidden" value={passport.passportId} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Full name
                              <Input defaultValue={passport.fullName} name="fullName" required />
                            </label>
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Email
                              <Input defaultValue={passport.email ?? ""} name="email" type="email" />
                            </label>
                          </div>
                          <label className="block space-y-2 text-sm text-[#16130f]">
                            Headline
                            <Input defaultValue={passport.headline ?? ""} name="headline" />
                          </label>
                          <label className="block space-y-2 text-sm text-[#16130f]">
                            Bio
                            <Textarea defaultValue={passport.bio ?? ""} name="bio" />
                          </label>
                          <label className="block space-y-2 text-sm text-[#16130f]">
                            Passport skills
                            <Input defaultValue={passport.skills.join(", ")} name="skills" />
                          </label>

                          <div className="space-y-3">
                            <p className="label-caps">Projects</p>
                            {editableProjects.map((project, index) => {
                              const projectKey = `${passport.passportId}-${index}`;
                              const imageUrl = resolveEditProjectImageUrl(projectKey, project.imageUrl);
                              return (
                                <fieldset
                                  className="space-y-3 border border-[#d7cebd] bg-[#fbf8f0] p-4"
                                  key={projectKey}
                                >
                                  <legend className="font-serif text-lg text-[#16130f]">
                                    Project {index + 1}
                                  </legend>
                                  <label className="block space-y-2 text-sm text-[#16130f]">
                                    Project title
                                    <Input defaultValue={project.title} name="projectTitle" />
                                  </label>
                                  <label className="block space-y-2 text-sm text-[#16130f]">
                                    One-liner
                                    <Input defaultValue={project.hook} name="projectHook" />
                                  </label>
                                  <label className="block space-y-2 text-sm text-[#16130f]">
                                    Description
                                    <Textarea defaultValue={project.description} name="projectDescription" />
                                  </label>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block space-y-2 text-sm text-[#16130f]">
                                      Category
                                      <Input defaultValue={project.category} name="projectCategory" />
                                    </label>
                                    <label className="block space-y-2 text-sm text-[#16130f]">
                                      Skills/tags
                                      <Input defaultValue={project.skills.join(", ")} name="projectSkills" />
                                    </label>
                                  </div>
                                  <label className="block space-y-2 text-sm text-[#16130f]">
                                    Project link
                                    <Input defaultValue={project.artifactUrl ?? ""} name="projectLink" />
                                  </label>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block space-y-2 text-sm text-[#16130f]">
                                      Project image
                                      <Input
                                        accept="image/*"
                                        disabled={uploadingProjectId === projectKey}
                                        onChange={(event) => {
                                          void uploadEditProjectImage(
                                            projectKey,
                                            event.currentTarget.files?.[0] ?? null
                                          );
                                        }}
                                        type="file"
                                      />
                                    </label>
                                    <label className="block space-y-2 text-sm text-[#16130f]">
                                      Image URL
                                      <Input
                                        name="projectImageUrl"
                                        onChange={(event) =>
                                          updateEditProjectImageUrl(projectKey, event.target.value)
                                        }
                                        value={imageUrl}
                                      />
                                    </label>
                                  </div>
                                  {imageUrl ? (
                                    <div className="overflow-hidden border border-[#d7cebd] bg-[#e5ded1]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img alt="" className="h-40 w-full object-cover" src={imageUrl} />
                                    </div>
                                  ) : null}
                                  {uploadingProjectId === projectKey ? (
                                    <p className="text-sm text-[#7b705f]">Uploading image...</p>
                                  ) : null}
                                </fieldset>
                              );
                            })}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Featured work title
                              <Input
                                defaultValue={passport.featuredWork?.title ?? ""}
                                name="featuredWorkTitle"
                              />
                            </label>
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Public slug
                              <Input defaultValue={passport.passportSlug ?? ""} name="passportSlug" />
                            </label>
                          </div>
                          <label className="block space-y-2 text-sm text-[#16130f]">
                            Featured work description
                            <Textarea
                              defaultValue={passport.featuredWork?.description ?? ""}
                              name="featuredWorkDescription"
                            />
                          </label>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Resume link
                              <Input defaultValue={passport.resumeUrl ?? ""} name="resumeUrl" />
                            </label>
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              Portfolio link
                              <Input defaultValue={passport.portfolioUrl ?? ""} name="portfolioUrl" />
                            </label>
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              LinkedIn link
                              <Input defaultValue={passport.linkedinUrl ?? ""} name="linkedinUrl" />
                            </label>
                            <label className="block space-y-2 text-sm text-[#16130f]">
                              GitHub link
                              <Input defaultValue={passport.githubUrl ?? ""} name="githubUrl" />
                            </label>
                          </div>
                          <Button disabled={isUpdating || Boolean(uploadingProjectId)} type="submit">
                            {isUpdating ? "Saving..." : "Save changes"}
                          </Button>
                        </form>
                      </details>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                      {canManage ? (
                        <form action={regenerateFormAction}>
                          <input name="passportId" type="hidden" value={passport.passportId} />
                          <Button disabled={isRegenerating} type="submit" variant="secondary">
                            {isRegenerating ? "Generating..." : "Regenerate claim link"}
                          </Button>
                        </form>
                      ) : null}
                      {canManage ? (
                        <form
                          action={deleteFormAction}
                          onSubmit={(event) => {
                            if (!window.confirm(`Delete the claimable Passport for ${passport.fullName}?`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input name="passportId" type="hidden" value={passport.passportId} />
                          <Button disabled={isDeleting} type="submit" variant="danger">
                            {isDeleting ? "Deleting..." : "Delete"}
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
