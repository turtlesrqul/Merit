/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";
import { normalizeArtifactUrl, resolveProjectVisualPreview } from "@/lib/artifacts";
import {
  buildPreparedArtifacts,
  categoryForProjectType,
  normalizeProjectType,
  parseCommaSeparatedSkills,
  parseLineSeparatedLinks,
  validateVisualRequirements
} from "@/lib/projects/form-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormProps = {
  mode: "create" | "edit";
  initialData?: {
    projectId?: string;
    title?: string;
    hook?: string;
    problemSolved?: string;
    whatWasBuilt?: string;
    category?: string;
    projectType?: "web" | "design" | "document" | "other";
    coverImageUrl?: string;
    impact?: string;
    skills?: string[];
    artifactLinks?: string[];
  };
};

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_UPLOAD_BYTES = 10 * 1024 * 1024;

function isLegacyProjectSchemaError(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("column projects.cover_image_url does not exist") ||
    message.includes("column projects.hook does not exist") ||
    message.includes("column projects.project_type does not exist") ||
    message.includes("could not find the 'cover_image_url' column of 'projects' in the schema cache") ||
    message.includes("could not find the 'hook' column of 'projects' in the schema cache") ||
    message.includes("could not find the 'project_type' column of 'projects' in the schema cache")
  );
}

function mergeArtifactLinks(existingValue: string, urls: string[]): string {
  const merged = Array.from(new Set([...parseLineSeparatedLinks(existingValue), ...urls])).filter(Boolean);
  return merged.join("\n");
}

function projectTypeLabel(type: "web" | "design" | "document" | "other") {
  if (type === "web") return "Web App / Website";
  if (type === "design") return "Design / Visual";
  if (type === "document") return "Deck / Document";
  return "Other";
}

function artifactPlaceholder(projectType: "web" | "design" | "document" | "other") {
  if (projectType === "web") {
    return "https://your-app.com\nhttps://github.com/you/project";
  }
  if (projectType === "design") {
    return "https://images.example.com/mockup.png\nhttps://www.figma.com/file/...";
  }
  if (projectType === "document") {
    return "https://files.example.com/case-study.pdf\nhttps://files.example.com/pitch-deck.pptx";
  }
  return "https://example.com/project-demo\nhttps://files.example.com/model.glb";
}

function artifactTips(projectType: "web" | "design" | "document" | "other") {
  if (projectType === "web") {
    return [
      "Add the live app URL so users can open and test it directly on Merit.",
      "Some websites block iframe embeds; add a cover image for a guaranteed clean fallback."
    ];
  }
  if (projectType === "design") {
    return [
      "Upload images for full-screen zoom viewing on Merit.",
      "Figma links are supported, but include at least one image as visual backup."
    ];
  }
  if (projectType === "document") {
    return [
      "PDFs render best in Merit's in-app viewer.",
      "PPTX/DOCX/XLSX can be viewed, but converting key decks to PDF gives the most consistent experience."
    ];
  }
  return [
    "For 3D projects, upload GLB, GLTF, STL, or OBJ for interactive in-app viewing.",
    "For CAD-native formats that cannot render in browser, include a cover image."
  ];
}

export function ProjectForm({ mode, initialData }: ProjectFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [hook, setHook] = useState(initialData?.hook ?? initialData?.problemSolved ?? "");
  const [whatWasBuilt, setWhatWasBuilt] = useState(initialData?.whatWasBuilt ?? "");
  const [projectType, setProjectType] = useState(
    initialData?.projectType ?? normalizeProjectType(initialData?.projectType ?? "web")
  );
  const [skills, setSkills] = useState((initialData?.skills ?? []).join(", "));
  const [artifactLinks, setArtifactLinks] = useState((initialData?.artifactLinks ?? []).join("\n"));
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl ?? "");
  const [impact, setImpact] = useState(initialData?.impact ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isThumbnailDragActive, setIsThumbnailDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadMessage, setThumbnailUploadMessage] = useState<string | null>(null);
  const [thumbnailObjectFit, setThumbnailObjectFit] = useState<"contain" | "cover">("contain");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const heading = mode === "create" ? "Add Project" : "Edit Project";
  const preparedArtifacts = useMemo(() => buildPreparedArtifacts(artifactLinks), [artifactLinks]);
  const normalizedSkillList = useMemo(
    () => Array.from(new Set(parseCommaSeparatedSkills(skills))),
    [skills]
  );
  const visual = useMemo(
    () =>
      resolveProjectVisualPreview({
        artifacts: preparedArtifacts.map((artifact) => ({
          url: artifact.artifact_url,
          type: artifact.artifact_type,
          previewUrl: artifact.preview_url
        })),
        coverImageUrl: normalizeArtifactUrl(coverImageUrl) || null,
        projectType
      }),
    [preparedArtifacts, coverImageUrl, projectType]
  );
  const thumbnailCandidates = useMemo(
    () =>
      preparedArtifacts
        .filter(
          (artifact): artifact is (typeof preparedArtifacts)[number] & { preview_url: string } =>
            typeof artifact.preview_url === "string" && artifact.preview_url.trim().length > 0
        )
        .slice(0, 8),
    [preparedArtifacts]
  );

  const resolveSkillIds = async (skillNames: string[]) => {
    const supabase = createBrowserSupabaseClient();
    const ids: string[] = [];

    for (const skillName of skillNames) {
      const { data: existingSkill, error: existingSkillError } = await supabase
        .from("skill_tags")
        .select("skill_id")
        .eq("skill_name", skillName)
        .maybeSingle();

      if (existingSkillError) {
        throw new Error(existingSkillError.message);
      }

      if (existingSkill && typeof (existingSkill as Record<string, unknown>).skill_id === "string") {
        ids.push((existingSkill as Record<string, unknown>).skill_id as string);
        continue;
      }

      const { data: insertedSkill, error: insertSkillError } = await supabase
        .from("skill_tags")
        .insert({ skill_name: skillName })
        .select("skill_id")
        .single();

      if (insertSkillError) {
        const { data: racedSkill, error: racedSkillError } = await supabase
          .from("skill_tags")
          .select("skill_id")
          .eq("skill_name", skillName)
          .single();
        if (racedSkillError) {
          throw new Error(insertSkillError.message);
        }
        const racedRow = racedSkill as Record<string, unknown>;
        if (typeof racedRow.skill_id === "string") {
          ids.push(racedRow.skill_id);
          continue;
        }
      }

      const row = insertedSkill as Record<string, unknown>;
      if (typeof row.skill_id === "string") {
        ids.push(row.skill_id);
      }
    }
    return ids;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploadingFiles(true);
    setUploadMessage(null);
    setErrorMessage(null);

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`${file.name} is larger than 50MB. Please upload a smaller file.`);
        }
      }

      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/artifacts/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        urls?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const uploadedUrls = Array.isArray(payload.urls) ? payload.urls : [];
      if (uploadedUrls.length === 0) {
        throw new Error("No uploaded file URLs were returned.");
      }

      setArtifactLinks((prev) => mergeArtifactLinks(prev, uploadedUrls));
      setUploadMessage(
        `Uploaded ${uploadedUrls.length} file${uploadedUrls.length === 1 ? "" : "s"} to project artifacts.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const uploadThumbnailFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Thumbnail upload only supports image files.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
      setErrorMessage("Thumbnail image must be 10MB or smaller.");
      return;
    }

    setIsUploadingThumbnail(true);
    setThumbnailUploadMessage(null);
    setErrorMessage(null);

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

      setCoverImageUrl(uploadedUrl);
      setThumbnailUploadMessage("Thumbnail uploaded and selected.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Thumbnail upload failed.");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }
    await uploadFiles(files);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer.files?.length) {
      await uploadFiles(event.dataTransfer.files);
    }
  };

  const handleThumbnailDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsThumbnailDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await uploadThumbnailFile(file);
    }
  };

  const handleThumbnailInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadThumbnailFile(file);
    }
    event.target.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isUploadingFiles) {
      setErrorMessage("Please wait for file uploads to finish before publishing.");
      return;
    }
    if (isUploadingThumbnail) {
      setErrorMessage("Please wait for thumbnail upload to finish before publishing.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { supabase, user } = await requireVerifiedBrowserUser("publishing or editing projects");

      const normalizedTitle = title.trim();
      const normalizedHook = hook.trim();
      const normalizedSkills = Array.from(new Set(parseCommaSeparatedSkills(skills)));
      const normalizedCoverImage = normalizeArtifactUrl(coverImageUrl);
      const visualValidationMessage = validateVisualRequirements({
        preparedArtifacts,
        coverImageUrl: normalizedCoverImage
      });
      if (visualValidationMessage) {
        throw new Error(visualValidationMessage);
      }

      const normalizedType = normalizeProjectType(projectType);
      const category = categoryForProjectType(normalizedType);
      const description = whatWasBuilt.trim();
      const legacyProblem = normalizedHook || normalizedTitle;

      let projectId = initialData?.projectId;
      const modernProjectPayload = {
        title: normalizedTitle,
        hook: normalizedHook || legacyProblem,
        problem_solved: legacyProblem,
        what_was_built: description,
        category,
        project_type: normalizedType,
        cover_image_url: normalizedCoverImage || null,
        impact: impact.trim() || null
      };
      const legacyProjectPayload = {
        title: normalizedTitle,
        problem_solved: legacyProblem,
        what_was_built: description,
        category,
        impact: impact.trim() || null
      };

      if (mode === "create") {
        let createResult = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            ...modernProjectPayload
          })
          .select("project_id")
          .single();
        if (createResult.error && isLegacyProjectSchemaError(createResult.error.message)) {
          createResult = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              ...legacyProjectPayload
            })
            .select("project_id")
            .single();
        }

        const { data, error } = createResult;

        if (error) {
          throw new Error(error.message);
        }

        const row = data as Record<string, unknown>;
        if (typeof row.project_id !== "string") {
          throw new Error("Missing project id after creation.");
        }

        projectId = row.project_id;
      } else {
        if (!projectId) {
          throw new Error("Missing project id.");
        }

        let updateResult = await supabase
          .from("projects")
          .update(modernProjectPayload)
          .eq("project_id", projectId)
          .eq("user_id", user.id);
        if (updateResult.error && isLegacyProjectSchemaError(updateResult.error.message)) {
          updateResult = await supabase
            .from("projects")
            .update(legacyProjectPayload)
            .eq("project_id", projectId)
            .eq("user_id", user.id);
        }

        const { error } = updateResult;

        if (error) {
          throw new Error(error.message);
        }
      }

      if (!projectId) {
        throw new Error("Project id was not resolved.");
      }

      const skillIds = await resolveSkillIds(normalizedSkills);

      const { error: deleteSkillsError } = await supabase
        .from("project_skills")
        .delete()
        .eq("project_id", projectId);
      if (deleteSkillsError) {
        throw new Error(deleteSkillsError.message);
      }

      if (skillIds.length > 0) {
        const { error: insertSkillsError } = await supabase.from("project_skills").insert(
          skillIds.map((skillId) => ({
            project_id: projectId,
            skill_id: skillId
          }))
        );
        if (insertSkillsError) {
          throw new Error(insertSkillsError.message);
        }
      }

      const { error: deleteArtifactError } = await supabase
        .from("artifacts")
        .delete()
        .eq("project_id", projectId);
      if (deleteArtifactError) {
        throw new Error(deleteArtifactError.message);
      }

      if (preparedArtifacts.length > 0) {
        const artifactsWithPreview = preparedArtifacts.map((artifact) => ({
          project_id: projectId,
          artifact_type: artifact.artifact_type,
          artifact_url: artifact.artifact_url,
          preview_url: artifact.preview_url
        }));
        const { error: insertArtifactError } = await supabase.from("artifacts").insert(artifactsWithPreview);
        if (insertArtifactError) {
          if (insertArtifactError.message.toLowerCase().includes("preview_url")) {
            const { error: legacyInsertError } = await supabase.from("artifacts").insert(
              preparedArtifacts.map((artifact) => ({
                project_id: projectId,
                artifact_type: artifact.artifact_type,
                artifact_url: artifact.artifact_url
              }))
            );
            if (legacyInsertError) {
              throw new Error(legacyInsertError.message);
            }
          } else {
            throw new Error(insertArtifactError.message);
          }
        }
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <Card className="border-sun-200 bg-gradient-to-r from-sun-100 via-sun-50 to-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
              V2 Project Publisher
            </p>
            <h1 className="text-3xl font-semibold text-ink-950">{heading}</h1>
            <p className="text-sm text-ink-700">
              Create a visual-first project card recruiters can understand in one glance.
            </p>
          </div>
          <div className="rounded-xl border border-sun-300 bg-white px-3 py-2 text-sm text-ink-700">
            {preparedArtifacts.length} artifact{preparedArtifacts.length === 1 ? "" : "s"} attached
          </div>
        </div>
      </Card>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">1) Choose project type</h2>
              <p className="text-sm text-ink-600">Pick the format that best describes your main deliverable.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["web", "design", "document", "other"] as const).map((type) => (
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                    projectType === type ? "border-sun-400 bg-sun-50 text-ink-900" : "border-ink-200 text-ink-700"
                  }`}
                  key={type}
                >
                  <span>{projectTypeLabel(type)}</span>
                  <input
                    checked={projectType === type}
                    className="h-4 w-4"
                    name="projectType"
                    onChange={() => setProjectType(type)}
                    type="radio"
                    value={type}
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">2) Add main content</h2>
              <p className="text-sm text-ink-600">
                Upload files, paste links, and ensure at least one visual preview source.
              </p>
            </div>
            <div className="rounded-xl border border-sun-200 bg-sun-50/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-700">In-Merit viewer tips</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {artifactTips(projectType).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <input
              className="hidden"
              multiple
              onChange={handleFileInputChange}
              ref={fileInputRef}
              type="file"
            />
            <div
              className={`rounded-2xl border border-dashed p-5 transition-all ${
                isDragActive
                  ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                  : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDrop={handleDrop}
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
                    <p className="text-sm font-semibold text-ink-900">Drop project files here</p>
                    <p className="text-xs text-ink-600">
                      Drag files or click Choose files. Max 50MB each (media, CAD, PDFs, decks).
                    </p>
                  </div>
                </div>
                <Button
                  disabled={isUploadingFiles}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="secondary"
                >
                  {isUploadingFiles ? "Uploading..." : "Choose files"}
                </Button>
              </div>
            </div>
            {uploadMessage ? <p className="text-sm text-emerald-700">{uploadMessage}</p> : null}

            <label className="block space-y-2 text-sm text-ink-900">
              Artifact links (one per line)
              <Textarea
                className="min-h-[160px]"
                onChange={(event) => setArtifactLinks(event.target.value)}
                placeholder={artifactPlaceholder(projectType)}
                value={artifactLinks}
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-700">Thumbnail image upload</p>
              <input
                accept="image/*"
                className="hidden"
                disabled={isUploadingThumbnail}
                onChange={handleThumbnailInputChange}
                ref={thumbnailInputRef}
                type="file"
              />
              <div
                className={`rounded-2xl border border-dashed p-5 transition-all ${
                  isThumbnailDragActive
                    ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
                    : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsThumbnailDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsThumbnailDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsThumbnailDragActive(true);
                }}
                onDrop={handleThumbnailDrop}
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
            <div className="space-y-2">
              <p className="text-xs text-ink-600">
                This thumbnail is used as your primary card/miniplayer preview if set.
              </p>
              {coverImageUrl.trim() ? (
                <div className="max-w-sm overflow-hidden rounded-xl border border-ink-200">
                  <div className="aspect-[16/9] bg-slate-100">
                    <img
                      alt="Selected thumbnail preview"
                      className={`h-full w-full ${thumbnailObjectFit === "cover" ? "object-cover" : "object-contain p-1"}`}
                      src={coverImageUrl}
                    />
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setCoverImageUrl("")}
                  type="button"
                  variant={coverImageUrl.trim() ? "secondary" : "primary"}
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
                      coverImageUrl.trim().length > 0 &&
                      normalizeArtifactUrl(coverImageUrl) === normalizeArtifactUrl(previewUrl);

                    return (
                      <button
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          isSelected
                            ? "border-sun-400 ring-2 ring-sun-200"
                            : "border-ink-200 hover:border-sun-300"
                        }`}
                        key={`${artifact.artifact_url}-${previewUrl}`}
                        onClick={() => setCoverImageUrl(previewUrl)}
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
            </div>
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">3) Title and story</h2>
              <p className="text-sm text-ink-600">Keep this concise and scannable for discovery feed browsing.</p>
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              Project title
              <Input maxLength={120} onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              One-line hook
              <Input
                maxLength={140}
                onChange={(event) => setHook(event.target.value)}
                placeholder="What did you build and why does it matter?"
                required
                value={hook}
              />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              Short description (optional)
              <Textarea
                className="min-h-[120px]"
                onChange={(event) => setWhatWasBuilt(event.target.value)}
                placeholder="How it works, your role, and what makes it compelling."
                value={whatWasBuilt}
              />
            </label>
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Skills and impact</h2>
              <p className="text-sm text-ink-600">These improve filtering, search, and recruiter context.</p>
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              Skill tags (comma separated)
              <Input
                onChange={(event) => setSkills(event.target.value)}
                placeholder="next.js, figma, reliability engineering"
                value={skills}
              />
            </label>
            {normalizedSkillList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {normalizedSkillList.slice(0, 10).map((skill) => (
                  <span
                    className="rounded-full border border-sun-200 bg-sun-50 px-2.5 py-1 text-xs font-medium text-ink-700"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            <label className="block space-y-2 text-sm text-ink-900">
              Optional impact summary
              <Textarea
                className="min-h-[120px]"
                onChange={(event) => setImpact(event.target.value)}
                placeholder="Reduced review time by 30% across 40 student users."
                value={impact}
              />
            </label>
          </Card>

          <Card className="space-y-3 border-ink-100">
            {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
            <Button className="w-full sm:w-auto" disabled={isSubmitting || isUploadingFiles || isUploadingThumbnail} type="submit">
              {isUploadingFiles
                ? "Uploading files..."
                : isUploadingThumbnail
                  ? "Uploading thumbnail..."
                : isSubmitting
                  ? "Saving..."
                  : mode === "create"
                    ? "Publish Project"
                    : "Save Changes"}
            </Button>
          </Card>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Project Card Preview</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="overflow-hidden rounded-lg border border-ink-100">
                <div className="aspect-[16/9] bg-ink-100">
                  {visual.previewUrl ? (
                    <img
                      alt={`Preview for ${title || "project"}`}
                      className={`h-full w-full ${
                        visual.source === "cover"
                          ? thumbnailObjectFit === "cover"
                            ? "bg-slate-100 object-cover"
                            : "bg-slate-100 object-contain p-2"
                          : "object-cover"
                      }`}
                      src={visual.previewUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,218,106,0.42),transparent_34%),linear-gradient(120deg,#fff3c8_0%,#f7f9fc_55%,#eef2f8_100%)] text-sm text-ink-600">
                      Add artifacts or a cover image
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-ink-950">{title || "Untitled Project"}</p>
                <p className="text-sm text-ink-700">{hook || "Your one-line hook appears here."}</p>
                <p className="text-xs text-ink-500">{projectTypeLabel(projectType)}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 border-ink-100 bg-sun-50/60">
            <p className="text-sm font-semibold text-ink-900">Checklist</p>
            <p className="text-sm text-ink-700">{title.trim() ? "Done" : "Missing"} title</p>
            <p className="text-sm text-ink-700">{hook.trim() ? "Done" : "Missing"} one-line hook</p>
            <p className="text-sm text-ink-700">
              {preparedArtifacts.length > 0 || coverImageUrl.trim() ? "Done" : "Missing"} visual source
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
