/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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

const MAX_CV_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PORTFOLIO_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

type ProfileRoleType = "candidate" | "recruiter";
type ProfileSectionId = "projects" | "passport" | "portfolio" | "cv" | "activity" | "skills" | "saved";
type ProfileState = ProfileStudioProps["initialProfile"];

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

function mergeLineSeparatedLinks(existingValue: string, urls: string[]) {
  return Array.from(new Set([...parseLineSeparatedInput(existingValue), ...urls])).join("\n");
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
  return links.find((link) => isValidCvLink(link)) ?? "";
}

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

function isAllowedCvFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_CV_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime =
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return hasAllowedExtension || hasAllowedMime;
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

function PencilEditButton({
  onClick,
  label
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7ccb8] bg-white text-[#4b4439] transition hover:border-[#bfa062] hover:text-[#201c16]"
      onClick={onClick}
      type="button"
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M4 20h4l10-10a2.12 2.12 0 0 0-3-3L5 17v3z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="m14 6 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    </button>
  );
}

function UploadDropCard({
  title,
  description,
  isActive,
  isBusy,
  chooseLabel,
  busyLabel,
  onChoose,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop
}: {
  title: string;
  description: string;
  isActive: boolean;
  isBusy: boolean;
  chooseLabel: string;
  busyLabel: string;
  onChoose: () => void;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-5 transition-all ${
        isActive
          ? "border-sun-400 bg-[radial-gradient(circle_at_22%_18%,rgba(244,207,89,0.22),transparent_43%),linear-gradient(180deg,#fff7de_0%,#fbf4e8_100%)] shadow-[0_10px_22px_rgba(127,97,34,0.12)]"
          : "border-ink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,244,239,0.86)_100%)]"
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
            <p className="text-sm font-semibold text-ink-900">{title}</p>
            <p className="text-xs text-ink-600">{description}</p>
          </div>
        </div>
        <Button disabled={isBusy} onClick={onChoose} type="button" variant="secondary">
          {isBusy ? busyLabel : chooseLabel}
        </Button>
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
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isUploadingPortfolioFiles, setIsUploadingPortfolioFiles] = useState(false);
  const [portfolioUploadMessage, setPortfolioUploadMessage] = useState<string | null>(null);
  const [isInlinePortfolioDragActive, setIsInlinePortfolioDragActive] = useState(false);
  const [isModalPortfolioDragActive, setIsModalPortfolioDragActive] = useState(false);
  const [isInlineCvDragActive, setIsInlineCvDragActive] = useState(false);
  const [isModalCvDragActive, setIsModalCvDragActive] = useState(false);
  const [isInlineHeadlineEditing, setIsInlineHeadlineEditing] = useState(false);
  const [inlineHeadlineDraft, setInlineHeadlineDraft] = useState(initialProfile.headline);
  const [inlineHeadlineSaving, setInlineHeadlineSaving] = useState(false);
  const [inlineHeadlineError, setInlineHeadlineError] = useState<string | null>(null);
  const [isInlineNameEditing, setIsInlineNameEditing] = useState(false);
  const [inlineNameDraft, setInlineNameDraft] = useState(initialProfile.name);
  const [inlineNameSaving, setInlineNameSaving] = useState(false);
  const [inlineNameError, setInlineNameError] = useState<string | null>(null);
  const [isInlineContactEditing, setIsInlineContactEditing] = useState(false);
  const [isInlineRoleEditing, setIsInlineRoleEditing] = useState(false);
  const [isInlineRolesEditing, setIsInlineRolesEditing] = useState(false);
  const [isInlinePortfolioEditing, setIsInlinePortfolioEditing] = useState(false);
  const [isInlineCvEditing, setIsInlineCvEditing] = useState(false);
  const inlinePortfolioInputRef = useRef<HTMLInputElement | null>(null);
  const modalPortfolioInputRef = useRef<HTMLInputElement | null>(null);
  const inlineCvInputRef = useRef<HTMLInputElement | null>(null);
  const modalCvInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!isInlineHeadlineEditing) {
      setInlineHeadlineDraft(profile.headline);
      setInlineHeadlineError(null);
    }
  }, [isInlineHeadlineEditing, profile.headline]);

  useEffect(() => {
    if (!isInlineNameEditing) {
      setInlineNameDraft(profile.name);
      setInlineNameError(null);
    }
  }, [isInlineNameEditing, profile.name]);

  const persistProfilePatch = async (patch: Partial<ProfileState>) => {
    const nextProfile: ProfileState = {
      ...profile,
      ...patch
    };
    const parsedScore = calculateProfileCompletionScore({
      name: nextProfile.name,
      headline: nextProfile.headline,
      bio: nextProfile.bio,
      contactEmail: nextProfile.contactEmail,
      targetRoles: nextProfile.targetRoles,
      portfolioLinks: nextProfile.portfolioLinks
    });

    const supabase = createBrowserSupabaseClient();
    const userResult = await supabase
      .from("users")
      .update({
        name: nextProfile.name,
        role_type: nextProfile.roleType,
        headline: nextProfile.headline,
        target_roles: nextProfile.targetRoles
      })
      .eq("user_id", userId);

    if (userResult.error) {
      throw new Error(userResult.error.message);
    }

    const profileResult = await supabase.from("candidate_profiles").upsert(
      {
        user_id: userId,
        bio: nextProfile.bio,
        contact_email: nextProfile.contactEmail || null,
        portfolio_links: nextProfile.portfolioLinks,
        profile_completion_score: parsedScore
      },
      { onConflict: "user_id" }
    );

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }

    setProfile({
      ...nextProfile,
      profileCompletionScore: parsedScore
    });
    router.refresh();
  };

  const saveInlineName = async () => {
    setInlineNameSaving(true);
    setInlineNameError(null);

    try {
      const normalizedName = inlineNameDraft.trim() || profile.name;
      await persistProfilePatch({ name: normalizedName });
      setIsInlineNameEditing(false);
    } catch (error) {
      setInlineNameError(error instanceof Error ? error.message : "Failed to save name.");
    } finally {
      setInlineNameSaving(false);
    }
  };

  const saveInlineHeadline = async () => {
    setInlineHeadlineSaving(true);
    setInlineHeadlineError(null);

    try {
      const normalizedHeadline = inlineHeadlineDraft.trim();
      await persistProfilePatch({ headline: normalizedHeadline });
      setHeadlineDraft(normalizedHeadline);
      setIsInlineHeadlineEditing(false);
    } catch (error) {
      setInlineHeadlineError(error instanceof Error ? error.message : "Failed to save headline.");
    } finally {
      setInlineHeadlineSaving(false);
    }
  };

  const uploadCvFile = async (file: File) => {
    if (!isAllowedCvFile(file)) {
      setPassportError("Upload a valid CV file (.pdf, .doc, or .docx).");
      return;
    }

    if (file.size > MAX_CV_UPLOAD_BYTES) {
      setPassportError("CV file must be 15MB or smaller.");
      return;
    }

    setPassportError(null);
    setPassportSuccess(null);
    setIsUploadingCv(true);

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
        throw new Error(payload.error ?? "Failed to upload CV file.");
      }

      const uploadedCvUrl = Array.isArray(payload.urls) ? payload.urls[0] : undefined;
      if (!uploadedCvUrl) {
        throw new Error("No CV URL was returned after upload.");
      }

      setCvLinkDraft(uploadedCvUrl);
      setPassportSuccess("CV file uploaded. Save Passport to publish it.");
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Failed to upload CV file.");
    } finally {
      setIsUploadingCv(false);
    }
  };

  const uploadPortfolioFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) {
      return;
    }

    setPassportError(null);
    setPassportSuccess(null);
    setPortfolioUploadMessage(null);
    setIsUploadingPortfolioFiles(true);

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_PORTFOLIO_UPLOAD_BYTES) {
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
        throw new Error(payload.error ?? "Failed to upload portfolio files.");
      }

      const uploadedUrls = Array.isArray(payload.urls) ? payload.urls : [];
      if (uploadedUrls.length === 0) {
        throw new Error("No portfolio file URLs were returned.");
      }

      setPortfolioLinksDraft((prev) => mergeLineSeparatedLinks(prev, uploadedUrls));
      setPortfolioUploadMessage(
        `Uploaded ${uploadedUrls.length} file${uploadedUrls.length === 1 ? "" : "s"} and added links.`
      );
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Failed to upload portfolio files.");
    } finally {
      setIsUploadingPortfolioFiles(false);
    }
  };

  const handleCvFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadCvFile(file);
    }
    event.target.value = "";
  };

  const handleInlineCvDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsInlineCvDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await uploadCvFile(file);
    }
  };

  const handleModalCvDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsModalCvDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await uploadCvFile(file);
    }
  };

  const handlePortfolioFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      await uploadPortfolioFiles(files);
    }
    event.target.value = "";
  };

  const handleInlinePortfolioDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsInlinePortfolioDragActive(false);
    if (event.dataTransfer.files?.length) {
      await uploadPortfolioFiles(event.dataTransfer.files);
    }
  };

  const handleModalPortfolioDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsModalPortfolioDragActive(false);
    if (event.dataTransfer.files?.length) {
      await uploadPortfolioFiles(event.dataTransfer.files);
    }
  };

  const saveIdentity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentitySaving(true);
    setIdentityError(null);
    setIdentitySuccess(null);

    try {
      await persistProfilePatch({
        name: nameDraft,
        roleType: roleTypeDraft,
        headline: headlineDraft,
        bio: bioDraft
      });
      setIdentitySuccess("Identity updated.");
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : "Unable to save identity.");
    } finally {
      setIdentitySaving(false);
    }
  };

  const savePassport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);

    const normalizedHeadline = headlineDraft.trim();
    const parsedTargetRoles = parseCommaSeparatedInput(targetRolesDraft);
    const parsedPortfolioLinks = parseLineSeparatedInput(portfolioLinksDraft);
    const normalizedCvLink = cvLinkDraft.trim();
    if (normalizedCvLink && !isValidCvLink(normalizedCvLink)) {
      setPassportError("Enter a valid CV link (PDF, DOC, DOCX, or Google Doc). LinkedIn is not accepted as a CV.");
      setPassportSaving(false);
      return;
    }

    const portfolioLinksWithCv = normalizedCvLink
      ? [normalizedCvLink, ...parsedPortfolioLinks]
      : parsedPortfolioLinks;
    const dedupedPortfolioLinks = Array.from(new Set(portfolioLinksWithCv));

    try {
      await persistProfilePatch({
        headline: normalizedHeadline,
        contactEmail: contactEmailDraft,
        targetRoles: parsedTargetRoles,
        portfolioLinks: dedupedPortfolioLinks
      });
      setPassportSuccess("Passport updated.");
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save passport.");
    } finally {
      setPassportSaving(false);
    }
  };

  const saveInlineContact = async () => {
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);
    try {
      await persistProfilePatch({ contactEmail: contactEmailDraft.trim() });
      setPassportSuccess("Contact email updated.");
      setIsInlineContactEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save contact email.");
    } finally {
      setPassportSaving(false);
    }
  };

  const saveInlineRoleType = async () => {
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);
    try {
      await persistProfilePatch({ roleType: roleTypeDraft });
      setPassportSuccess("Role updated.");
      setIsInlineRoleEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save role.");
    } finally {
      setPassportSaving(false);
    }
  };

  const saveInlineTargetRoles = async () => {
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);
    try {
      const parsedTargetRoles = parseCommaSeparatedInput(targetRolesDraft);
      await persistProfilePatch({ targetRoles: parsedTargetRoles });
      setPassportSuccess("Target roles updated.");
      setIsInlineRolesEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save target roles.");
    } finally {
      setPassportSaving(false);
    }
  };

  const saveInlinePortfolioLinks = async () => {
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);
    try {
      const parsedPortfolioLinks = parseLineSeparatedInput(portfolioLinksDraft);
      const currentCv = findCvLink(profile.portfolioLinks);
      const merged = currentCv ? [currentCv, ...parsedPortfolioLinks] : parsedPortfolioLinks;
      const dedupedPortfolioLinks = Array.from(new Set(merged));
      await persistProfilePatch({ portfolioLinks: dedupedPortfolioLinks });
      setPassportSuccess("Portfolio links updated.");
      setIsInlinePortfolioEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save portfolio links.");
    } finally {
      setPassportSaving(false);
    }
  };

  const saveInlineCv = async () => {
    setPassportSaving(true);
    setPassportError(null);
    setPassportSuccess(null);
    try {
      const normalizedCvLink = cvLinkDraft.trim();
      if (normalizedCvLink && !isValidCvLink(normalizedCvLink)) {
        throw new Error("Enter a valid CV link (PDF, DOC, DOCX, or Google Doc). LinkedIn is not accepted as a CV.");
      }

      const nonCvLinks = profile.portfolioLinks.filter((link) => !isValidCvLink(link));
      const merged = normalizedCvLink ? [normalizedCvLink, ...nonCvLinks] : nonCvLinks;
      const dedupedPortfolioLinks = Array.from(new Set(merged));
      await persistProfilePatch({ portfolioLinks: dedupedPortfolioLinks });
      setPassportSuccess("CV / Resume updated.");
      setIsInlineCvEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save CV / Resume.");
    } finally {
      setPassportSaving(false);
    }
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
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-2 border-sun-200">
              <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Readiness</p>
              <p className="text-3xl font-semibold text-ink-950">{profile.profileCompletionScore}%</p>
            </Card>
            <Card className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Identity</p>
                <PencilEditButton
                  label="Edit role type"
                  onClick={() => {
                    setRoleTypeDraft(profile.roleType);
                    setIsInlineRoleEditing((current) => !current);
                    setPassportError(null);
                    setPassportSuccess(null);
                  }}
                />
              </div>
              {isInlineRoleEditing ? (
                <div className="space-y-2">
                  <select
                    className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none ring-offset-white focus:border-sun-400 focus:ring-4 focus:ring-sun-100"
                    onChange={(event) => setRoleTypeDraft(event.target.value as ProfileRoleType)}
                    value={roleTypeDraft}
                  >
                    <option value="candidate">Candidate</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={passportSaving} onClick={saveInlineRoleType}>
                      {passportSaving ? "Saving..." : "Save role"}
                    </Button>
                    <Button onClick={() => setIsInlineRoleEditing(false)} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-base font-semibold text-ink-950 capitalize">{profile.roleType}</p>
              )}
              <p className="text-sm text-ink-700">{profile.headline || "Add a headline with the pencil icon."}</p>
            </Card>
            <Card className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Target roles</p>
                <PencilEditButton
                  label="Edit target roles"
                  onClick={() => {
                    setTargetRolesDraft(profile.targetRoles.join(", "));
                    setIsInlineRolesEditing((current) => !current);
                    setPassportError(null);
                    setPassportSuccess(null);
                  }}
                />
              </div>
              {isInlineRolesEditing ? (
                <div className="space-y-2">
                  <Input
                    onChange={(event) => setTargetRolesDraft(event.target.value)}
                    placeholder="Frontend Engineer Intern, Product Designer"
                    value={targetRolesDraft}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={passportSaving} onClick={saveInlineTargetRoles}>
                      {passportSaving ? "Saving..." : "Save roles"}
                    </Button>
                    <Button onClick={() => setIsInlineRolesEditing(false)} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : profile.targetRoles.length > 0 ? (
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.1em] text-ink-600">Contact</p>
                <PencilEditButton
                  label="Edit contact email"
                  onClick={() => {
                    setContactEmailDraft(profile.contactEmail);
                    setIsInlineContactEditing((current) => !current);
                    setPassportError(null);
                    setPassportSuccess(null);
                  }}
                />
              </div>
              {isInlineContactEditing ? (
                <div className="space-y-2">
                  <Input
                    onChange={(event) => setContactEmailDraft(event.target.value)}
                    placeholder="name@email.com"
                    type="email"
                    value={contactEmailDraft}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={passportSaving} onClick={saveInlineContact}>
                      {passportSaving ? "Saving..." : "Save email"}
                    </Button>
                    <Button onClick={() => setIsInlineContactEditing(false)} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-800">{profile.contactEmail || "No contact email set."}</p>
              )}
              <Link className="text-sm font-semibold text-ink-900 underline underline-offset-2" href={`/c/${userId}`}>
                View public passport
              </Link>
            </Card>
          </div>
          {passportError ? <p className="text-sm text-red-700">{passportError}</p> : null}
          {passportSuccess ? <p className="text-sm text-green-700">{passportSuccess}</p> : null}
        </section>
      );
    }

    if (activeSection === "portfolio") {
      return (
        <section className="space-y-4" id="section-portfolio">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Embedded portfolio</h2>
            <PencilEditButton
              label="Edit portfolio links"
              onClick={() => {
                setPortfolioLinksDraft(profile.portfolioLinks.filter((link) => !isValidCvLink(link)).join("\n"));
                setPassportError(null);
                setPassportSuccess(null);
                setPortfolioUploadMessage(null);
                setIsInlinePortfolioDragActive(false);
                setIsInlinePortfolioEditing((current) => !current);
              }}
            />
          </div>
          {isInlinePortfolioEditing ? (
            <Card className="space-y-3 border-ink-100">
              <input
                className="hidden"
                multiple
                onChange={handlePortfolioFileInputChange}
                ref={inlinePortfolioInputRef}
                type="file"
              />
              <p className="text-xs text-ink-600">Upload your Portfolio</p>
              <UploadDropCard
                busyLabel="Uploading..."
                chooseLabel="Choose files"
                description="Drag files here or click Choose files."
                isActive={isInlinePortfolioDragActive}
                isBusy={isUploadingPortfolioFiles}
                onChoose={() => inlinePortfolioInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsInlinePortfolioDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsInlinePortfolioDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsInlinePortfolioDragActive(true);
                }}
                onDrop={handleInlinePortfolioDrop}
                title="Drop portfolio files here"
              />
              {isUploadingPortfolioFiles ? <p className="text-xs text-ink-600">Uploading portfolio files...</p> : null}
              {portfolioUploadMessage ? <p className="text-xs text-emerald-700">{portfolioUploadMessage}</p> : null}
              <label className="block space-y-2 text-sm text-ink-900">
                Portfolio links (one per line)
                <Textarea
                  className="min-h-[120px]"
                  onChange={(event) => setPortfolioLinksDraft(event.target.value)}
                  placeholder={"https://your-site.com\nhttps://behance.net/you"}
                  value={portfolioLinksDraft}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button disabled={passportSaving || isUploadingPortfolioFiles} onClick={saveInlinePortfolioLinks}>
                  {passportSaving ? "Saving..." : "Save links"}
                </Button>
                <Button
                  onClick={() => {
                    setIsInlinePortfolioEditing(false);
                    setPortfolioLinksDraft(profile.portfolioLinks.filter((link) => !isValidCvLink(link)).join("\n"));
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}
          {profile.portfolioLinks.length === 0 ? (
            <Card className="space-y-3">
              <p className="text-sm text-ink-700">
                Add Framer, GitHub Pages, Behance, Notion, or personal site links to power this embedded space.
              </p>
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
            <PencilEditButton
              label="Edit CV or resume"
              onClick={() => {
                setCvLinkDraft(findCvLink(profile.portfolioLinks));
                setPassportError(null);
                setPassportSuccess(null);
                setIsInlineCvDragActive(false);
                setIsInlineCvEditing((current) => !current);
              }}
            />
          </div>
          {isInlineCvEditing ? (
            <Card className="space-y-3 border-ink-100">
              <div className="space-y-2">
                <p className="text-xs text-ink-600">Upload your CV</p>
                <input
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={isUploadingCv}
                  onChange={handleCvFileInputChange}
                  ref={inlineCvInputRef}
                  type="file"
                />
                <UploadDropCard
                  busyLabel="Uploading..."
                  chooseLabel="Choose file"
                  description="Drag file here or click Choose file. PDF, DOC, DOCX up to 15MB."
                  isActive={isInlineCvDragActive}
                  isBusy={isUploadingCv}
                  onChoose={() => inlineCvInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsInlineCvDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsInlineCvDragActive(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsInlineCvDragActive(true);
                  }}
                  onDrop={handleInlineCvDrop}
                  title="Drop CV file here"
                />
                {isUploadingCv ? <p className="text-xs text-ink-600">Uploading CV...</p> : null}
              </div>
              <label className="block space-y-2 text-sm text-ink-900">
                CV / Resume link
                <Input
                  onChange={(event) => setCvLinkDraft(event.target.value)}
                  placeholder="https://your-site.com/resume.pdf"
                  value={cvLinkDraft}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button disabled={passportSaving || isUploadingCv} onClick={saveInlineCv}>
                  {passportSaving ? "Saving..." : "Save CV / Resume"}
                </Button>
                <Button onClick={() => setIsInlineCvEditing(false)} variant="secondary">
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}
          {!cvLink ? (
            <Card className="space-y-3">
              <p className="text-sm text-ink-700">
                No CV or resume added yet. Use the pencil icon to add a valid resume link or upload a CV file.
              </p>
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
              display="icons"
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="space-y-4 border-[#ddcfac] bg-gradient-to-r from-[#f7f1e2] to-[#fdfbf7]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6455]">Passport</p>
              {isInlineNameEditing ? (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    className="max-w-xl text-2xl font-semibold"
                    disabled={inlineNameSaving}
                    onChange={(event) => setInlineNameDraft(event.target.value)}
                    placeholder="Merit Builder"
                    value={inlineNameDraft}
                  />
                  {inlineNameError ? <p className="text-xs text-red-700">{inlineNameError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={inlineNameSaving} onClick={saveInlineName}>
                      {inlineNameSaving ? "Saving..." : "Save name"}
                    </Button>
                    <Button
                      disabled={inlineNameSaving}
                      onClick={() => {
                        setIsInlineNameEditing(false);
                        setInlineNameDraft(profile.name);
                        setInlineNameError(null);
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-5xl font-semibold tracking-tight text-[#171512]">{profile.name || "Merit Builder"}</h1>
                  <PencilEditButton
                    label="Edit name"
                    onClick={() => {
                      setInlineNameDraft(profile.name);
                      setInlineNameError(null);
                      setIsInlineNameEditing(true);
                    }}
                  />
                </div>
              )}
              {isInlineHeadlineEditing ? (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    className="max-w-xl"
                    disabled={inlineHeadlineSaving}
                    onChange={(event) => setInlineHeadlineDraft(event.target.value)}
                    placeholder="Add a headline to define your identity."
                    value={inlineHeadlineDraft}
                  />
                  {inlineHeadlineError ? <p className="text-xs text-red-700">{inlineHeadlineError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={inlineHeadlineSaving} onClick={saveInlineHeadline} type="button">
                      {inlineHeadlineSaving ? "Saving..." : "Save headline"}
                    </Button>
                    <Button
                      disabled={inlineHeadlineSaving}
                      onClick={() => {
                        setIsInlineHeadlineEditing(false);
                        setInlineHeadlineDraft(profile.headline);
                        setInlineHeadlineError(null);
                      }}
                      type="button"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    className="max-w-xl text-left text-sm text-[#5e574c] underline-offset-2 hover:text-[#3d372f] hover:underline"
                    onClick={() => {
                      setInlineHeadlineDraft(profile.headline);
                      setInlineHeadlineError(null);
                      setIsInlineHeadlineEditing(true);
                    }}
                    type="button"
                  >
                    {profile.headline || "Add a headline to define your identity."}
                  </button>
                  <PencilEditButton
                    label="Edit headline"
                    onClick={() => {
                      setInlineHeadlineDraft(profile.headline);
                      setInlineHeadlineError(null);
                      setIsInlineHeadlineEditing(true);
                    }}
                  />
                </div>
              )}
              <div className="luxury-rule w-44" />
              <div className="flex flex-wrap gap-2">
                <Badge className="capitalize">{profile.roleType}</Badge>
                <Badge>{ownProjects.length} projects</Badge>
              </div>
            </div>
          </div>

          {featuredProject ? (
            <div className="grid gap-3 rounded-2xl border border-[#e6dccd] bg-[#fffdf9] p-3 md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-[#e8dece]">
                <div className="aspect-[4/3] bg-[#ece4d4]">
                  {featuredVisual?.previewUrl ? (
                    <img
                      alt={`${featuredProject.title} preview`}
                      className="h-full w-full object-cover"
                      src={featuredVisual.previewUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#7a7265]">
                      Preview unavailable
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.1em] text-[#6d6455]">Featured build</p>
                <h2 className="text-2xl font-semibold tracking-tight text-[#171512]">{featuredProject.title}</h2>
                <p className="text-sm text-[#5e574c]">{featuredProject.hook || featuredProject.problemSolved}</p>
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
            <div className="rounded-2xl border border-dashed border-[#e2d7c4] bg-[#fdf8ef] p-4">
              <p className="text-sm text-[#5e574c]">
                Publish your first project to activate the featured proof section.
              </p>
            </div>
          )}
        </Card>

        <Card className="space-y-3 border-[#e5dccd] bg-[#fdfbf7]">
          <p className="text-xs uppercase tracking-[0.12em] text-[#6d6455]">Readiness snapshot</p>
          <p className="text-5xl font-semibold tracking-tight text-[#171512]">{profile.profileCompletionScore}%</p>
          <p className="text-sm text-[#5e574c]">
            Profile readiness is based on identity, contact, role intent, portfolio links, and project evidence.
          </p>
          <Link href={`/c/${userId}`}>
            <Button className="w-full" variant="secondary">
              View passport as recruiters
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="sticky top-24 z-20 border-[#e5dccd] bg-[#fdfbf7]/95 p-3 backdrop-blur">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {sections.map((section) => (
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === section.id
                    ? "bg-[#efe2c6] text-[#171512] shadow-[inset_0_-2px_0_0_rgba(155,124,57,0.75)]"
                    : "bg-[#fffdf9] text-[#665d50] hover:bg-[#f6efdf] hover:text-[#1e1a14]"
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
            <p className="text-xs text-ink-600">
              Share your background, role focus, interests, and how you position yourself.
            </p>
            <Textarea
              onChange={(event) => setBioDraft(event.target.value)}
              placeholder="Tell us about yourself. Include your background, role, and interests."
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
        <form className="space-y-6" onSubmit={savePassport}>
          <div className="rounded-xl border border-ink-100 bg-ink-50/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-700">Passport profile</p>
            <p className="mt-1 text-sm text-ink-700">
              Update contact signals, role intent, headline, and resume details shown to recruiters.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm text-ink-900">
              Headline
              <Input
                onChange={(event) => setHeadlineDraft(event.target.value)}
                placeholder="Builder identity in one sentence"
                value={headlineDraft}
              />
            </label>
            <label className="block space-y-2 text-sm text-ink-900">
              Contact email
              <Input
                onChange={(event) => setContactEmailDraft(event.target.value)}
                type="email"
                value={contactEmailDraft}
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm text-ink-900">
            Target roles (comma separated)
            <Input
              onChange={(event) => setTargetRolesDraft(event.target.value)}
              placeholder="Frontend Engineer Intern, Product Designer"
              value={targetRolesDraft}
            />
          </label>

          <div className="space-y-3 rounded-xl border border-ink-100 p-4">
            <div className="space-y-2">
              <p className="text-xs text-ink-600">Upload your CV</p>
              <input
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={isUploadingCv}
                onChange={handleCvFileInputChange}
                ref={modalCvInputRef}
                type="file"
              />
              <UploadDropCard
                busyLabel="Uploading..."
                chooseLabel="Choose file"
                description="Drag file here or click Choose file. PDF, DOC, DOCX up to 15MB."
                isActive={isModalCvDragActive}
                isBusy={isUploadingCv}
                onChoose={() => modalCvInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsModalCvDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsModalCvDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsModalCvDragActive(true);
                }}
                onDrop={handleModalCvDrop}
                title="Drop CV file here"
              />
              {isUploadingCv ? <p className="text-xs text-ink-600">Uploading CV...</p> : null}
            </div>
            <label className="block space-y-2 text-sm text-ink-900">
              CV / Resume link
              <Input
                onChange={(event) => setCvLinkDraft(event.target.value)}
                placeholder="https://your-site.com/resume.pdf"
                value={cvLinkDraft}
              />
            </label>
          </div>

          <div className="space-y-3">
            <input
              className="hidden"
              multiple
              onChange={handlePortfolioFileInputChange}
              ref={modalPortfolioInputRef}
              type="file"
            />
            <p className="text-xs text-ink-600">Upload your Portfolio</p>
            <UploadDropCard
              busyLabel="Uploading..."
              chooseLabel="Choose files"
              description="Drag files here or click Choose files."
              isActive={isModalPortfolioDragActive}
              isBusy={isUploadingPortfolioFiles}
              onChoose={() => modalPortfolioInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsModalPortfolioDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsModalPortfolioDragActive(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsModalPortfolioDragActive(true);
              }}
              onDrop={handleModalPortfolioDrop}
              title="Drop portfolio files here"
            />
            {isUploadingPortfolioFiles ? <p className="text-xs text-ink-600">Uploading portfolio files...</p> : null}
            {portfolioUploadMessage ? <p className="text-xs text-emerald-700">{portfolioUploadMessage}</p> : null}
            <label className="block space-y-2 text-sm text-ink-900">
              Portfolio links (one URL per line)
              <Textarea
                className="min-h-[140px]"
                onChange={(event) => setPortfolioLinksDraft(event.target.value)}
                placeholder={"https://your-site.com\nhttps://behance.net/you"}
                value={portfolioLinksDraft}
              />
            </label>
          </div>
          {passportError ? <p className="text-sm text-red-700">{passportError}</p> : null}
          {passportSuccess ? <p className="text-sm text-green-700">{passportSuccess}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-2">
            <Button onClick={() => setPassportModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              className="min-w-[160px]"
              disabled={passportSaving || isUploadingCv || isUploadingPortfolioFiles}
              type="submit"
            >
              {passportSaving ? "Saving..." : "Save passport"}
            </Button>
          </div>
        </form>
      </ProfileModal>
    </section>
  );
}
