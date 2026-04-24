/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  buildArtifactPreviewUrl,
  detectArtifactType,
  getArtifactDisplayLabel,
  normalizeArtifactUrl
} from "@/lib/artifacts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormProps = {
  mode: "create" | "edit";
  initialData?: {
    projectId?: string;
    title?: string;
    problemSolved?: string;
    whatWasBuilt?: string;
    category?: string;
    impact?: string;
    skills?: string[];
    artifactLinks?: string[];
  };
};

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseLineSeparated(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mergeArtifactLinks(existingValue: string, urls: string[]): string {
  const merged = Array.from(new Set([...parseLineSeparated(existingValue), ...urls])).filter(Boolean);
  return merged.join("\n");
}

export function ProjectForm({ mode, initialData }: ProjectFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [problemSolved, setProblemSolved] = useState(initialData?.problemSolved ?? "");
  const [whatWasBuilt, setWhatWasBuilt] = useState(initialData?.whatWasBuilt ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "Tech");
  const [skills, setSkills] = useState((initialData?.skills ?? []).join(", "));
  const [artifactLinks, setArtifactLinks] = useState((initialData?.artifactLinks ?? []).join("\n"));
  const [impact, setImpact] = useState(initialData?.impact ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const heading = mode === "create" ? "Add Project" : "Edit Project";
  const artifactPreview = useMemo(() => {
    const normalizedLinks = Array.from(new Set(parseLineSeparated(artifactLinks))).map(
      normalizeArtifactUrl
    );

    return normalizedLinks
      .filter(Boolean)
      .map((artifactUrl) => {
        const artifactType = detectArtifactType(artifactUrl);
        return {
          artifactUrl,
          artifactType,
          previewUrl: buildArtifactPreviewUrl(artifactUrl, artifactType),
          label: getArtifactDisplayLabel(artifactUrl)
        };
      });
  }, [artifactLinks]);
  const normalizedSkillList = useMemo(
    () => Array.from(new Set(parseCommaSeparated(skills))),
    [skills]
  );
  const primaryArtifact = artifactPreview[0];

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

      // Handle rare race where another user inserts same skill in parallel.
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
          throw new Error(
            `${file.name} is larger than 50MB. Please upload a smaller file.`
          );
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

  const handleFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isUploadingFiles) {
      setErrorMessage("Please wait for file uploads to finish before publishing.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please sign in again.");
      }

      const normalizedSkills = Array.from(new Set(parseCommaSeparated(skills)));
      const normalizedArtifacts = Array.from(new Set(parseLineSeparated(artifactLinks))).map(
        normalizeArtifactUrl
      );
      const preparedArtifacts = normalizedArtifacts
        .filter(Boolean)
        .map((artifactUrl) => {
          const artifactType = detectArtifactType(artifactUrl);
          return {
            artifact_url: artifactUrl,
            artifact_type: artifactType,
            preview_url: buildArtifactPreviewUrl(artifactUrl, artifactType)
          };
        });

      let projectId = initialData?.projectId;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            title,
            problem_solved: problemSolved,
            what_was_built: whatWasBuilt,
            category,
            impact: impact || null
          })
          .select("project_id")
          .single();

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

        const { error } = await supabase
          .from("projects")
          .update({
            title,
            problem_solved: problemSolved,
            what_was_built: whatWasBuilt,
            category,
            impact: impact || null
          })
          .eq("project_id", projectId)
          .eq("user_id", user.id);

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
        const { error: insertArtifactError } = await supabase
          .from("artifacts")
          .insert(artifactsWithPreview);
        if (insertArtifactError) {
          // Backward-compat fallback if preview_url migration has not been applied yet.
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

      router.push("/profile");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <Card className="border-sun-200 bg-gradient-to-r from-sun-100 via-sun-50 to-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
              Project Proof Builder
            </p>
            <h1 className="text-3xl font-semibold text-ink-950">{heading}</h1>
            <p className="text-sm text-ink-700">
              Shape a card recruiters can evaluate in under 30 seconds.
            </p>
          </div>
          <div className="rounded-xl border border-sun-300 bg-white px-3 py-2 text-sm text-ink-700">
            {artifactPreview.length} artifact{artifactPreview.length === 1 ? "" : "s"} attached
          </div>
        </div>
      </Card>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Basics</h2>
              <p className="text-sm text-ink-600">
                Describe the project outcome and your contribution clearly.
              </p>
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              Project title
              <Input onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              Problem solved
              <Textarea
                className="min-h-[140px]"
                onChange={(event) => setProblemSolved(event.target.value)}
                required
                value={problemSolved}
              />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              What was built
              <Textarea
                className="min-h-[140px]"
                onChange={(event) => setWhatWasBuilt(event.target.value)}
                required
                value={whatWasBuilt}
              />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              Project type
              <Input onChange={(event) => setCategory(event.target.value)} required value={category} />
            </label>
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Skills</h2>
              <p className="text-sm text-ink-600">
                Use concrete skills to improve matching and recruiter filtering.
              </p>
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              Skill tags (comma separated)
              <Input
                onChange={(event) => setSkills(event.target.value)}
                placeholder="next.js, product design, market research"
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
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Artifacts</h2>
              <p className="text-sm text-ink-600">
                Add live URLs or drop files directly. Great for CAD files, PDFs, decks, media, and demos.
              </p>
            </div>
            <input
              className="hidden"
              multiple
              onChange={handleFileInputChange}
              ref={fileInputRef}
              type="file"
            />
            <div
              className={`rounded-xl border border-dashed p-4 transition-colors ${
                isDragActive ? "border-sun-400 bg-sun-50" : "border-ink-200 bg-slate-50/70"
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Drop project files here</p>
                  <p className="text-xs text-ink-600">
                    Max 50MB per file. Files upload to Supabase Storage and auto-attach as links.
                  </p>
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
                placeholder={`https://your-app.com\nhttps://github.com/you/project\nhttps://youtu.be/...`}
                value={artifactLinks}
              />
            </label>
          </Card>

          <Card className="space-y-4 border-ink-100">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Impact</h2>
              <p className="text-sm text-ink-600">
                Quantify results if possible: adoption, speed, accuracy, revenue, or time saved.
              </p>
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              Optional impact summary
              <Textarea
                className="min-h-[120px]"
                onChange={(event) => setImpact(event.target.value)}
                placeholder="Reduced onboarding time by 30% for student users."
                value={impact}
              />
            </label>
          </Card>

          <Card className="space-y-3 border-ink-100">
            {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
            <Button className="w-full sm:w-auto" disabled={isSubmitting || isUploadingFiles} type="submit">
              {isUploadingFiles
                ? "Uploading files..."
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">
                Recruiter Preview
              </p>
            </div>
            <div className="space-y-4 p-4">
              <div className="overflow-hidden rounded-lg border border-ink-100">
                <div className="aspect-video bg-ink-100">
                  {primaryArtifact?.previewUrl ? (
                    <img
                      alt={`Preview for ${primaryArtifact.label}`}
                      className="h-full w-full object-cover"
                      src={primaryArtifact.previewUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-ink-500">
                      Add an artifact to see thumbnail preview
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-ink-950">{title || "Untitled Project"}</p>
                <p className="text-sm text-ink-600">{category || "Project"}</p>
              </div>
              <div className="space-y-1">
                <p className="max-h-16 overflow-hidden text-sm text-ink-700">
                  {whatWasBuilt || "Explain what you built in concrete terms."}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 border-ink-100 bg-sun-50/60">
            <p className="text-sm font-semibold text-ink-900">Checklist</p>
            <p className="text-sm text-ink-700">
              {title.trim() ? "Done" : "Missing"} title, {problemSolved.trim() ? "done" : "missing"}{" "}
              problem, {whatWasBuilt.trim() ? "done" : "missing"} build summary.
            </p>
            <p className="text-sm text-ink-700">
              {normalizedSkillList.length > 0 ? "Done" : "Missing"} skill tags,{" "}
              {artifactPreview.length > 0 ? "done" : "missing"} artifacts.
            </p>
          </Card>

          {artifactPreview.length > 0 ? (
            <Card className="space-y-3 border-ink-100">
              <p className="text-sm font-semibold text-ink-900">Artifact Gallery</p>
              <div className="grid gap-3">
                {artifactPreview.slice(0, 4).map((artifact) => (
                  <a
                    className="flex items-center gap-3 rounded-xl border border-ink-100 p-2 hover:bg-sun-50"
                    href={artifact.artifactUrl}
                    key={artifact.artifactUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="h-14 w-24 flex-shrink-0 overflow-hidden rounded-md bg-ink-100">
                      {artifact.previewUrl ? (
                        <img
                          alt={`Artifact preview for ${artifact.label}`}
                          className="h-full w-full object-cover"
                          src={artifact.previewUrl}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-ink-500">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{artifact.label}</p>
                      <p className="text-xs capitalize text-ink-600">{artifact.artifactType}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </form>
    </div>
  );
}
