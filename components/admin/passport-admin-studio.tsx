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
import { ProjectImageCarousel, type ProjectCarouselImage } from "@/components/projects/project-image-carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeArtifactUrl, resolveProjectVisualPreview, type ProjectType } from "@/lib/artifacts";
import { trackMeritEvent } from "@/lib/analytics/client";
import type { ClaimablePassport } from "@/lib/db/claimable-passports";
import {
  buildPreparedArtifacts,
  categoryForProjectType,
  parseCommaSeparatedSkills,
  parseLineSeparatedLinks,
  validateVisualRequirements
} from "@/lib/projects/form-validation";
import {
  artifactPlaceholder,
  artifactTips,
  projectTypeLabel
} from "@/lib/projects/project-form-copy";

type AdminClaimablePassport = Omit<ClaimablePassport, "claimToken"> & {
  claimLink: string | null;
};

type PassportAdminStudioProps = {
  passports: AdminClaimablePassport[];
};

const initialActionState: AdminPassportActionState = {
  status: "idle",
  message: null,
  claimLink: null,
  passportId: null
};

const MAX_ADMIN_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_UPLOAD_BYTES = 10 * 1024 * 1024;

type ExtraCreateProjectDraft = {
  id: string;
  type: ProjectType;
  title: string;
  hook: string;
  description: string;
  skills: string;
  links: string;
  imageUrls: string;
  isFilesDragActive: boolean;
  isThumbnailDragActive: boolean;
  uploadMessage: string | null;
  thumbnailMessage: string | null;
  thumbnailObjectFit: "contain" | "cover";
};

function createExtraProjectDraft(id: string): ExtraCreateProjectDraft {
  return {
    id,
    type: "web",
    title: "",
    hook: "",
    description: "",
    skills: "",
    links: "",
    imageUrls: "",
    isFilesDragActive: false,
    isThumbnailDragActive: false,
    uploadMessage: null,
    thumbnailMessage: null,
    thumbnailObjectFit: "contain"
  };
}

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
    artifactUrls: [],
    imageUrl: null,
    imageUrls: []
  };
}

function getEditableProjects(passport: AdminClaimablePassport) {
  return passport.projects.length > 0 ? passport.projects : [createEmptyProject()];
}

function mergeLineSeparatedLinks(existingValue: string, urls: string[]) {
  return Array.from(new Set([...parseLineSeparatedLinks(existingValue), ...urls])).join("\n");
}

function replacePrimaryImageUrl(existingValue: string, url: string) {
  const normalizedUrl = normalizeArtifactUrl(url);
  const remainingUrls = parseLineSeparatedLinks(existingValue).filter(
    (entry) => normalizeArtifactUrl(entry) !== normalizedUrl
  );
  return [url, ...remainingUrls].join("\n");
}

function getImageUrlsFromFiles(files: File[], urls: string[]) {
  return urls.filter((_, index) => files[index]?.type.startsWith("image/"));
}

function getProjectImageCarouselImages(imageUrls: string[]): ProjectCarouselImage[] {
  return imageUrls
    .map((url, index) => ({
      label: `Image ${index + 1}`,
      url: normalizeArtifactUrl(url)
    }))
    .filter((image) => image.url.length > 0);
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
  const [createProjectFileUploadMessage, setCreateProjectFileUploadMessage] = useState<string | null>(null);
  const [isCreateProjectFilesDragActive, setIsCreateProjectFilesDragActive] = useState(false);
  const [createExtraProjects, setCreateExtraProjects] = useState<ExtraCreateProjectDraft[]>([]);
  const [createPassportSlug, setCreatePassportSlug] = useState("");
  const [isCreateThumbnailDragActive, setIsCreateThumbnailDragActive] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadMessage, setThumbnailUploadMessage] = useState<string | null>(null);
  const [thumbnailObjectFit, setThumbnailObjectFit] = useState<"contain" | "cover">("contain");
  const nextCreateProjectIdRef = useRef(2);
  const [editProjectLinks, setEditProjectLinks] = useState<Record<string, string>>({});
  const [editProjectImageUrls, setEditProjectImageUrls] = useState<Record<string, string>>({});
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const preparedCreateArtifacts = useMemo(() => buildPreparedArtifacts(createProjectLink), [createProjectLink]);
  const createProjectImageUrls = useMemo(
    () => parseLineSeparatedLinks(createProjectImageUrl).map(normalizeArtifactUrl).filter(Boolean),
    [createProjectImageUrl]
  );
  const createPrimaryImageUrl = createProjectImageUrls[0] ?? "";
  const thumbnailCandidates = useMemo(
    () =>
      preparedCreateArtifacts
        .filter(
          (artifact): artifact is (typeof preparedCreateArtifacts)[number] & { preview_url: string } =>
            typeof artifact.preview_url === "string" && artifact.preview_url.trim().length > 0
        )
        .slice(0, 8),
    [preparedCreateArtifacts]
  );
  const normalizedCreateSkillList = useMemo(
    () => Array.from(new Set(parseCommaSeparatedSkills(createProjectSkills))),
    [createProjectSkills]
  );
  const normalizedCreatePassportSkillList = useMemo(
    () =>
      Array.from(
        new Set(
          [createProjectSkills, ...createExtraProjects.map((project) => project.skills)]
            .flatMap(parseCommaSeparatedSkills)
            .filter(Boolean)
        )
      ),
    [createExtraProjects, createProjectSkills]
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
        coverImageUrl: createPrimaryImageUrl || null,
        projectType: createProjectType
      }),
    [createPrimaryImageUrl, createProjectType, preparedCreateArtifacts]
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
    trackMeritEvent("claim_link_copied", {
      claim_passport_id: latestPassportId,
      source: "latest_result"
    });
    setCopiedLink(latestLink);
  };

  const copyClaimLink = async (claimLink: string, passportId: string) => {
    await navigator.clipboard.writeText(claimLink);
    trackMeritEvent("claim_link_copied", {
      claim_passport_id: passportId,
      source: "recent_passports"
    });
    setCopiedLink(claimLink);
  };

  const updateEditProjectLinks = (id: string, links: string) => {
    setEditProjectLinks((currentLinks) => ({
      ...currentLinks,
      [id]: links
    }));
  };

  const resolveEditProjectLinks = (id: string, fallback: string[]) =>
    editProjectLinks[id] ?? fallback.join("\n");

  const updateEditProjectImageUrls = (id: string, imageUrls: string) => {
    setEditProjectImageUrls((urls) => ({
      ...urls,
      [id]: imageUrls
    }));
  };

  const resolveEditProjectImageUrls = (id: string, fallback: string[]) =>
    editProjectImageUrls[id] ?? fallback.join("\n");

  const updateExtraProject = (id: string, patch: Partial<ExtraCreateProjectDraft>) => {
    setCreateExtraProjects((projects) =>
      projects.map((project) => (project.id === id ? { ...project, ...patch } : project))
    );
  };

  const addCreateProject = () => {
    const id = `create-project-${nextCreateProjectIdRef.current}`;
    nextCreateProjectIdRef.current += 1;
    setCreateExtraProjects((projects) => [...projects, createExtraProjectDraft(id)]);
  };

  const removeCreateProject = (id: string) => {
    setCreateExtraProjects((projects) => projects.filter((project) => project.id !== id));
  };

  const uploadAdminProjectFiles = async (
    uploadId: string,
    files: FileList | File[],
    onUploaded: (urls: string[], selectedFiles: File[]) => void
  ) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) {
      return;
    }

    for (const file of selectedFiles) {
      if (file.size > MAX_ADMIN_UPLOAD_BYTES) {
        setUploadError(`${file.name} exceeds the 50MB file limit.`);
        return;
      }
    }

    setUploadError(null);
    setUploadingProjectId(uploadId);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/admin/passports/project-image", {
        method: "POST",
        body: formData
      });
      const result = (await response.json().catch(() => ({}))) as { urls?: string[]; url?: string; error?: string };
      const urls = Array.isArray(result.urls) ? result.urls : result.url ? [result.url] : [];
      if (!response.ok || urls.length === 0) {
        throw new Error(result.error ?? "Failed to upload project files.");
      }
      onUploaded(urls, selectedFiles);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload project files.");
    } finally {
      setUploadingProjectId(null);
    }
  };

  const uploadCreateProjectFiles = async (files: FileList | File[]) => {
    await uploadAdminProjectFiles("create-project-1-files", files, (urls, selectedFiles) => {
      const imageUrls = getImageUrlsFromFiles(selectedFiles, urls);
      setCreateProjectLink((currentLinks) => mergeLineSeparatedLinks(currentLinks, urls));
      setCreateProjectImageUrl((currentImages) => mergeLineSeparatedLinks(currentImages, imageUrls));
      setCreateProjectFileUploadMessage(`${urls.length} file${urls.length === 1 ? "" : "s"} uploaded.`);
    });
  };

  const uploadExtraProjectFiles = async (project: ExtraCreateProjectDraft, files: FileList | File[]) => {
    await uploadAdminProjectFiles(`${project.id}-files`, files, (urls, selectedFiles) => {
      const imageUrls = getImageUrlsFromFiles(selectedFiles, urls);
      setCreateExtraProjects((projects) =>
        projects.map((currentProject) =>
          currentProject.id === project.id
            ? {
                ...currentProject,
                links: mergeLineSeparatedLinks(currentProject.links, urls),
                imageUrls: mergeLineSeparatedLinks(currentProject.imageUrls, imageUrls),
                uploadMessage: `${urls.length} file${urls.length === 1 ? "" : "s"} uploaded.`
              }
            : currentProject
        )
      );
    });
  };

  const uploadCreateThumbnailFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Thumbnail upload only supports image files.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
      setUploadError("Thumbnail image must be 10MB or smaller.");
      return;
    }

    setIsUploadingThumbnail(true);
    setThumbnailUploadMessage(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/artifacts/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        urls?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Thumbnail upload failed.");
      }

      const uploadedUrl = Array.isArray(payload.urls) ? payload.urls[0] : undefined;
      if (!uploadedUrl) {
        throw new Error("No thumbnail URL was returned.");
      }

      setCreateProjectImageUrl((currentImages) => replacePrimaryImageUrl(currentImages, uploadedUrl));
      setThumbnailUploadMessage("Thumbnail uploaded and selected.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Thumbnail upload failed.");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleCreateThumbnailInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      await uploadCreateThumbnailFile(file);
    }
    event.currentTarget.value = "";
  };

  const handleCreateThumbnailDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsCreateThumbnailDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await uploadCreateThumbnailFile(file);
    }
  };

  const uploadExtraThumbnailFile = async (project: ExtraCreateProjectDraft, file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Thumbnail upload only supports image files.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
      setUploadError("Thumbnail image must be 10MB or smaller.");
      return;
    }

    setUploadError(null);
    setUploadingProjectId(`${project.id}-thumbnail`);
    updateExtraProject(project.id, { thumbnailMessage: null });

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/artifacts/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        urls?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Thumbnail upload failed.");
      }

      const uploadedUrl = Array.isArray(payload.urls) ? payload.urls[0] : undefined;
      if (!uploadedUrl) {
        throw new Error("No thumbnail URL was returned.");
      }

      setCreateExtraProjects((projects) =>
        projects.map((currentProject) =>
          currentProject.id === project.id
            ? {
                ...currentProject,
                imageUrls: replacePrimaryImageUrl(currentProject.imageUrls, uploadedUrl),
                thumbnailMessage: "Thumbnail uploaded and selected."
              }
            : currentProject
        )
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Thumbnail upload failed.");
    } finally {
      setUploadingProjectId(null);
    }
  };

  const handleCreateProjectFilesDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsCreateProjectFilesDragActive(false);
    if (event.dataTransfer.files?.length) {
      await uploadCreateProjectFiles(event.dataTransfer.files);
    }
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (uploadingProjectId) {
      event.preventDefault();
      setUploadError("Please wait for image uploads to finish before creating the claim link.");
      return;
    }
    if (isUploadingThumbnail) {
      event.preventDefault();
      setUploadError("Please wait for thumbnail upload to finish before creating the claim link.");
      return;
    }

    const visualValidationMessage = validateVisualRequirements({
      preparedArtifacts: preparedCreateArtifacts,
      coverImageUrl: createPrimaryImageUrl
    });
    if (visualValidationMessage) {
      event.preventDefault();
      setUploadError(visualValidationMessage);
      return;
    }
    setUploadError(null);
  };

  const uploadEditProjectFiles = async (id: string, files: FileList | File[], currentLinks: string, currentImageUrls: string) => {
    await uploadAdminProjectFiles(id, files, (urls, selectedFiles) => {
      const imageUrls = getImageUrlsFromFiles(selectedFiles, urls);
      updateEditProjectLinks(id, mergeLineSeparatedLinks(currentLinks, urls));
      updateEditProjectImageUrls(id, mergeLineSeparatedLinks(currentImageUrls, imageUrls));
    });
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
          <input name="skills" type="hidden" value={normalizedCreatePassportSkillList.join(", ")} />

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
                <p className="mt-2 text-sm text-[#7b705f]">Paste project links and add a reliable visual thumbnail.</p>
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
                Project links (one per line)
                <Textarea
                  className="min-h-[120px]"
                  name="projectLink"
                  onChange={(event) => setCreateProjectLink(event.target.value)}
                  placeholder={artifactPlaceholder(createProjectType)}
                  value={createProjectLink}
                />
              </label>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-700">Project files and images</p>
                <input
                  className="hidden"
                  disabled={uploadingProjectId === "create-project-1-files"}
                  id="create-project-1-files"
                  multiple
                  onChange={(event) => {
                    if (event.currentTarget.files) {
                      void uploadCreateProjectFiles(event.currentTarget.files);
                    }
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
                <div
                  className={`rounded-xl border border-dashed p-4 transition-all ${
                    isCreateProjectFilesDragActive
                      ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                      : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsCreateProjectFilesDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsCreateProjectFilesDragActive(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsCreateProjectFilesDragActive(true);
                  }}
                  onDrop={handleCreateProjectFilesDrop}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Drop project files here</p>
                      <p className="text-xs text-ink-600">Images become slideshow images; all uploaded files are added as project links.</p>
                    </div>
                    <Button
                      disabled={uploadingProjectId === "create-project-1-files"}
                      onClick={() => document.getElementById("create-project-1-files")?.click()}
                      type="button"
                      variant="secondary"
                    >
                      {uploadingProjectId === "create-project-1-files" ? "Uploading..." : "Choose files"}
                    </Button>
                  </div>
                </div>
                {createProjectFileUploadMessage ? (
                  <p className="text-xs text-emerald-700">{createProjectFileUploadMessage}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-700">Thumbnail image upload</p>
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingThumbnail}
                  onChange={handleCreateThumbnailInputChange}
                  ref={thumbnailInputRef}
                  type="file"
                />
                <div
                  className={`rounded-xl border border-dashed p-4 transition-all ${
                    isCreateThumbnailDragActive
                      ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                      : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
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
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl border border-sun-200 bg-white/80 p-2 text-ink-700">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M12 16V8m0 0 3 3m-3-3-3 3M4 15.5A3.5 3.5 0 0 1 7.5 12h.5A5 5 0 1 1 18 12h.5a3.5 3.5 0 1 1 0 7H7a3 3 0 0 1-3-3z"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">Drop thumbnail image here</p>
                        <p className="text-xs text-ink-600">Use PNG/JPG/WebP and keep it under 10MB for fast loading.</p>
                      </div>
                    </div>
                    <Button
                      disabled={isUploadingThumbnail}
                      onClick={() => thumbnailInputRef.current?.click()}
                      type="button"
                      variant="secondary"
                    >
                      {isUploadingThumbnail ? "Uploading..." : "Choose image"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-ink-600">Select an image file from your device to use as the thumbnail.</p>
                {isUploadingThumbnail ? <p className="text-xs text-ink-600">Uploading thumbnail...</p> : null}
                {thumbnailUploadMessage ? <p className="text-xs text-emerald-700">{thumbnailUploadMessage}</p> : null}
              </div>

              <input name="projectImageUrl" type="hidden" value={createProjectImageUrl} />
              <div className="space-y-2">
                <p className="text-xs text-ink-600">
                  This thumbnail is used as your primary card/miniplayer preview if set.
                </p>
                {createPrimaryImageUrl ? (
                  <div className="max-w-sm overflow-hidden rounded-xl border border-ink-200">
                    <div className="aspect-[16/9] bg-slate-100">
                      <img
                        alt="Selected thumbnail preview"
                        className={`h-full w-full ${thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                        src={createPrimaryImageUrl}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setCreateProjectImageUrl("")}
                    type="button"
                    variant={createProjectImageUrls.length > 0 ? "secondary" : "primary"}
                  >
                    Use auto preview
                  </Button>
                  <div className="inline-flex overflow-hidden rounded-xl border border-ink-200">
                    <button
                      className={`px-3 py-1.5 text-xs font-semibold transition ${
                        thumbnailObjectFit === "contain" ? "bg-sun-100 text-ink-950" : "bg-white text-ink-700 hover:bg-slate-50"
                      }`}
                      onClick={() => setThumbnailObjectFit("contain")}
                      type="button"
                    >
                      Fit contain
                    </button>
                    <button
                      className={`border-l border-ink-200 px-3 py-1.5 text-xs font-semibold transition ${
                        thumbnailObjectFit === "cover" ? "bg-sun-100 text-ink-950" : "bg-white text-ink-700 hover:bg-slate-50"
                      }`}
                      onClick={() => setThumbnailObjectFit("cover")}
                      type="button"
                    >
                      Fit cover
                    </button>
                  </div>
                </div>
                {thumbnailCandidates.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {thumbnailCandidates.map((artifact) => {
                      const previewUrl = artifact.preview_url;
                      const isSelected =
                        createPrimaryImageUrl.length > 0 &&
                        createPrimaryImageUrl === normalizeArtifactUrl(previewUrl);

                      return (
                        <button
                          className={`overflow-hidden rounded-xl border text-left transition ${
                            isSelected
                              ? "border-sun-400 ring-2 ring-sun-200"
                              : "border-ink-200 hover:border-sun-300"
                          }`}
                          key={`${artifact.artifact_url}-${previewUrl}`}
                          onClick={() =>
                            setCreateProjectImageUrl((currentImages) => replacePrimaryImageUrl(currentImages, previewUrl))
                          }
                          type="button"
                        >
                          <div className="aspect-[16/9] bg-slate-100">
                            <img
                              alt="Thumbnail candidate preview"
                              className={`h-full w-full ${thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                              src={previewUrl}
                            />
                          </div>
                          <div className="px-2 py-1 text-xs text-ink-700">
                            {artifact.artifact_type}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {createProjectImageUrls.length > 1 ? (
                  <div className="max-w-2xl">
                    <ProjectImageCarousel
                      images={getProjectImageCarouselImages(createProjectImageUrls)}
                      title={createProjectTitle || "Project 1"}
                    />
                  </div>
                ) : null}
              </div>
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
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl text-[#16130f]">Additional projects</h3>
                  <p className="mt-2 text-sm text-[#7b705f]">Add more project blocks before generating the claim link.</p>
                </div>
                <Button onClick={addCreateProject} type="button" variant="secondary">
                  Add another project
                </Button>
              </div>

              {createExtraProjects.length === 0 ? (
                <p className="border border-[#d7cebd] bg-[#f4f0e8] p-3 text-sm text-[#7b705f]">
                  One project is included by default. Add another when the Passport should launch with multiple projects.
                </p>
              ) : null}

              {createExtraProjects.map((project, index) => {
                const projectNumber = index + 2;
                const projectCategory = categoryForProjectType(project.type);
                const projectPreparedArtifacts = buildPreparedArtifacts(project.links);
                const projectImageUrls = parseLineSeparatedLinks(project.imageUrls).map(normalizeArtifactUrl).filter(Boolean);
                const primaryProjectImageUrl = projectImageUrls[0] ?? "";
                const projectThumbnailCandidates = projectPreparedArtifacts
                  .filter(
                    (artifact): artifact is (typeof projectPreparedArtifacts)[number] & { preview_url: string } =>
                      typeof artifact.preview_url === "string" && artifact.preview_url.trim().length > 0
                  )
                  .slice(0, 6);
                const projectVisual = resolveProjectVisualPreview({
                  artifacts: projectPreparedArtifacts.map((artifact) => ({
                    url: artifact.artifact_url,
                    type: artifact.artifact_type,
                    previewUrl: artifact.preview_url
                  })),
                  coverImageUrl: primaryProjectImageUrl || null,
                  projectType: project.type
                });

                return (
                  <fieldset className="space-y-4 border border-[#d7cebd] bg-[#fbf8f0] p-4" key={project.id}>
                    <input name="projectCategory" type="hidden" value={projectCategory} />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-serif text-xl text-[#16130f]">Project {projectNumber}</p>
                      <Button onClick={() => removeCreateProject(project.id)} type="button" variant="secondary">
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["web", "design", "document", "other"] as const).map((type) => (
                        <label
                          className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-sm ${
                            project.type === type
                              ? "border-[#f3c945] bg-[#f3c945] text-[#16130f]"
                              : "border-[#16130f] text-[#16130f]"
                          }`}
                          key={`${project.id}-${type}`}
                        >
                          <span>{projectTypeLabel(type)}</span>
                          <input
                            checked={project.type === type}
                            className="h-4 w-4"
                            onChange={() => updateExtraProject(project.id, { type })}
                            type="radio"
                          />
                        </label>
                      ))}
                    </div>

                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Project title
                      <Input
                        maxLength={120}
                        name="projectTitle"
                        onChange={(event) => updateExtraProject(project.id, { title: event.target.value })}
                        placeholder="Portfolio redesign"
                        value={project.title}
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      One-line hook
                      <Input
                        maxLength={140}
                        name="projectHook"
                        onChange={(event) => updateExtraProject(project.id, { hook: event.target.value })}
                        placeholder="What was built and why does it matter?"
                        value={project.hook}
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Short description
                      <Textarea
                        className="min-h-[100px]"
                        name="projectDescription"
                        onChange={(event) => updateExtraProject(project.id, { description: event.target.value })}
                        placeholder="Role, process, and outcome."
                        value={project.description}
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      Skills/tools
                      <Input
                        name="projectSkills"
                        onChange={(event) => updateExtraProject(project.id, { skills: event.target.value })}
                        placeholder="figma, illustration, motion"
                        value={project.skills}
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#16130f]">
                      External links (one per line)
                      <Textarea
                        className="min-h-[100px]"
                        name="projectLink"
                        onChange={(event) => updateExtraProject(project.id, { links: event.target.value })}
                        placeholder={artifactPlaceholder(project.type)}
                        value={project.links}
                      />
                    </label>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-700">Project files and images</p>
                      <input
                        className="hidden"
                        disabled={uploadingProjectId === `${project.id}-files`}
                        id={`${project.id}-files`}
                        multiple
                        onChange={(event) => {
                          if (event.currentTarget.files) {
                            void uploadExtraProjectFiles(project, event.currentTarget.files);
                          }
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                      <div
                        className={`rounded-xl border border-dashed p-4 transition-all ${
                          project.isFilesDragActive
                            ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                            : "border-ink-200 bg-white"
                        }`}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isFilesDragActive: true });
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isFilesDragActive: false });
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isFilesDragActive: true });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isFilesDragActive: false });
                          if (event.dataTransfer.files?.length) {
                            void uploadExtraProjectFiles(project, event.dataTransfer.files);
                          }
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">Drop project files here</p>
                            <p className="text-xs text-ink-600">Images become slideshow images; all uploaded files are added as links.</p>
                          </div>
                          <Button
                            disabled={uploadingProjectId === `${project.id}-files`}
                            onClick={() => document.getElementById(`${project.id}-files`)?.click()}
                            type="button"
                            variant="secondary"
                          >
                            {uploadingProjectId === `${project.id}-files` ? "Uploading..." : "Choose files"}
                          </Button>
                        </div>
                      </div>
                      {project.uploadMessage ? <p className="text-xs text-emerald-700">{project.uploadMessage}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-700">Thumbnail image upload</p>
                      <input
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingProjectId === `${project.id}-thumbnail`}
                        id={`${project.id}-thumbnail`}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) {
                            void uploadExtraThumbnailFile(project, file);
                          }
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                      <div
                        className={`rounded-xl border border-dashed p-4 transition-all ${
                          project.isThumbnailDragActive
                            ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                            : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
                        }`}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isThumbnailDragActive: true });
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isThumbnailDragActive: false });
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isThumbnailDragActive: true });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          updateExtraProject(project.id, { isThumbnailDragActive: false });
                          const file = event.dataTransfer.files?.[0];
                          if (file) {
                            void uploadExtraThumbnailFile(project, file);
                          }
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">Drop thumbnail image here</p>
                            <p className="text-xs text-ink-600">Use PNG/JPG/WebP and keep it under 10MB for fast loading.</p>
                          </div>
                          <Button
                            disabled={uploadingProjectId === `${project.id}-thumbnail`}
                            onClick={() => document.getElementById(`${project.id}-thumbnail`)?.click()}
                            type="button"
                            variant="secondary"
                          >
                            {uploadingProjectId === `${project.id}-thumbnail` ? "Uploading..." : "Choose image"}
                          </Button>
                        </div>
                      </div>
                      {project.thumbnailMessage ? <p className="text-xs text-emerald-700">{project.thumbnailMessage}</p> : null}
                    </div>

                    <input name="projectImageUrl" type="hidden" value={project.imageUrls} />
                    {primaryProjectImageUrl ? (
                      <div className="max-w-sm overflow-hidden rounded-xl border border-ink-200">
                        <div className="aspect-[16/9] bg-slate-100">
                          <img
                            alt={`Selected thumbnail preview for project ${projectNumber}`}
                            className={`h-full w-full ${project.thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                            src={primaryProjectImageUrl}
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => updateExtraProject(project.id, { imageUrls: "" })}
                        type="button"
                        variant={projectImageUrls.length > 0 ? "secondary" : "primary"}
                      >
                        Use auto preview
                      </Button>
                      <div className="inline-flex overflow-hidden rounded-xl border border-ink-200">
                        <button
                          className={`px-3 py-1.5 text-xs font-semibold transition ${
                            project.thumbnailObjectFit === "contain" ? "bg-sun-100 text-ink-950" : "bg-white text-ink-700 hover:bg-slate-50"
                          }`}
                          onClick={() => updateExtraProject(project.id, { thumbnailObjectFit: "contain" })}
                          type="button"
                        >
                          Fit contain
                        </button>
                        <button
                          className={`border-l border-ink-200 px-3 py-1.5 text-xs font-semibold transition ${
                            project.thumbnailObjectFit === "cover" ? "bg-sun-100 text-ink-950" : "bg-white text-ink-700 hover:bg-slate-50"
                          }`}
                          onClick={() => updateExtraProject(project.id, { thumbnailObjectFit: "cover" })}
                          type="button"
                        >
                          Fit cover
                        </button>
                      </div>
                    </div>

                    {projectThumbnailCandidates.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {projectThumbnailCandidates.map((artifact) => {
                          const previewUrl = artifact.preview_url;
                          const isSelected =
                            primaryProjectImageUrl.length > 0 &&
                            primaryProjectImageUrl === normalizeArtifactUrl(previewUrl);

                          return (
                            <button
                              className={`overflow-hidden rounded-xl border text-left transition ${
                                isSelected
                                  ? "border-sun-400 ring-2 ring-sun-200"
                                  : "border-ink-200 hover:border-sun-300"
                              }`}
                              key={`${project.id}-${artifact.artifact_url}-${previewUrl}`}
                              onClick={() =>
                                updateExtraProject(project.id, {
                                  imageUrls: replacePrimaryImageUrl(project.imageUrls, previewUrl)
                                })
                              }
                              type="button"
                            >
                              <div className="aspect-[16/9] bg-slate-100">
                                <img
                                  alt={`Thumbnail candidate preview for project ${projectNumber}`}
                                  className={`h-full w-full ${project.thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                                  src={previewUrl}
                                />
                              </div>
                              <div className="px-2 py-1 text-xs text-ink-700">
                                {artifact.artifact_type}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {projectImageUrls.length > 1 ? (
                      <ProjectImageCarousel
                        images={getProjectImageCarouselImages(projectImageUrls)}
                        title={project.title || `Project ${projectNumber}`}
                      />
                    ) : projectVisual.previewUrl ? (
                      <div className="max-w-sm overflow-hidden border border-[#d7cebd]">
                        <div className="aspect-[16/9] bg-[#e5ded1]">
                          <img
                            alt={`Preview for ${project.title || `project ${projectNumber}`}`}
                            className="h-full w-full object-cover"
                            src={projectVisual.previewUrl}
                          />
                        </div>
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
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
              <Button className="w-full sm:w-auto" disabled={isCreating || Boolean(uploadingProjectId) || isUploadingThumbnail} type="submit">
                {isUploadingThumbnail
                  ? "Uploading thumbnail..."
                  : uploadingProjectId
                    ? "Uploading files..."
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
                {preparedCreateArtifacts.length > 0 || createProjectImageUrls.length > 0 ? "Done" : "Missing"} visual source
              </p>
              <p className="text-sm text-[#7b705f]">{createExtraProjects.length + 1} project{createExtraProjects.length === 0 ? "" : "s"} in this claim</p>
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

                    {passport.claimLink ? (
                      <div className="grid gap-2 border border-[#d7cebd] bg-[#f4f0e8] p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="block space-y-1 text-xs uppercase tracking-[0.12em] text-[#7b705f]">
                          Claim link
                          <Input readOnly value={passport.claimLink} />
                        </label>
                        <Button
                          className="self-end"
                          onClick={() => void copyClaimLink(passport.claimLink as string, passport.passportId)}
                          type="button"
                          variant="secondary"
                        >
                          {copiedLink === passport.claimLink ? "Copied" : "Copy link"}
                        </Button>
                      </div>
                    ) : canManage ? (
                      <p className="border border-[#d7cebd] bg-[#f4f0e8] p-3 text-sm text-[#7b705f]">
                        No copyable claim token is stored for this row yet. Regenerating once will create one.
                      </p>
                    ) : null}

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
                              const projectLinks = resolveEditProjectLinks(
                                projectKey,
                                project.artifactUrls.length > 0
                                  ? project.artifactUrls
                                  : project.artifactUrl
                                    ? [project.artifactUrl]
                                    : []
                              );
                              const imageUrls = resolveEditProjectImageUrls(
                                projectKey,
                                project.imageUrls.length > 0
                                  ? project.imageUrls
                                  : project.imageUrl
                                    ? [project.imageUrl]
                                    : []
                              );
                              const imageUrlList = parseLineSeparatedLinks(imageUrls).map(normalizeArtifactUrl).filter(Boolean);
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
                                    Project links (one per line)
                                    <Textarea
                                      className="min-h-[90px]"
                                      name="projectLink"
                                      onChange={(event) => updateEditProjectLinks(projectKey, event.target.value)}
                                      value={projectLinks}
                                    />
                                  </label>
                                  <div className="space-y-3">
                                    <Input
                                      disabled={uploadingProjectId === projectKey}
                                      multiple
                                      onChange={(event) => {
                                        if (event.currentTarget.files) {
                                          void uploadEditProjectFiles(
                                            projectKey,
                                            event.currentTarget.files,
                                            projectLinks,
                                            imageUrls
                                          );
                                        }
                                        event.currentTarget.value = "";
                                      }}
                                      type="file"
                                    />
                                    <label className="block space-y-2 text-sm text-[#16130f]">
                                      Image URLs for slideshow (one per line)
                                      <Textarea
                                        className="min-h-[90px]"
                                        name="projectImageUrl"
                                        onChange={(event) =>
                                          updateEditProjectImageUrls(projectKey, event.target.value)
                                        }
                                        value={imageUrls}
                                      />
                                    </label>
                                  </div>
                                  {imageUrlList.length > 0 ? (
                                    <div className="max-w-2xl">
                                      <ProjectImageCarousel
                                        images={getProjectImageCarouselImages(imageUrlList)}
                                        title={project.title || `Project ${index + 1}`}
                                      />
                                    </div>
                                  ) : null}
                                  {uploadingProjectId === projectKey ? (
                                    <p className="text-sm text-[#7b705f]">Uploading files...</p>
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
