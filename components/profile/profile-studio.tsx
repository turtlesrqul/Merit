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
import { SkillTagsToggle } from "@/components/profile/skill-tags-toggle";
import { ActionIcon, IconButton, iconControlClassName } from "@/components/ui/action-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_CV_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PORTFOLIO_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

type ProfileRoleType = "candidate" | "recruiter";
type ProfileSectionId =
  | "dashboard"
  | "passport"
  | "overview"
  | "profile"
  | "projects"
  | "portfolio"
  | "cv"
  | "activity"
  | "skills"
  | "saved";
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
    passportSlug: string | null;
    profileCompletionScore: number;
  };
  ownProjects: ProjectCardData[];
  savedProjects: ProjectCardData[];
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

const sections: Array<{ id: ProfileSectionId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "passport", label: "Passport" }
];

const PASSPORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizePassportSlug(value: string) {
  return value.trim().toLowerCase();
}

function isMissingPassportSlugColumn(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("candidate_profiles.passport_slug") || normalized.includes("passport_slug");
}

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
          <IconButton icon="x" label="Close modal" onClick={onClose} variant="ghost" />
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
          <div className="w-[min(340px,86vw)] shrink-0" key={project.projectId}>
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
      <ActionIcon name="pencil" />
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
        <IconButton disabled={isBusy} icon="upload" label={isBusy ? busyLabel : chooseLabel} onClick={onChoose} />
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
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("dashboard");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
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
  const [passportSlugDraft, setPassportSlugDraft] = useState(initialProfile.passportSlug ?? "");
  const [passportSlugError, setPassportSlugError] = useState<string | null>(null);
  const [passportSlugSuccess, setPassportSlugSuccess] = useState<string | null>(null);
  const [isPassportSlugEditing, setIsPassportSlugEditing] = useState(false);
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
  const [isInlineIdentityEditing, setIsInlineIdentityEditing] = useState(false);
  const [isInlinePassportEditing, setIsInlinePassportEditing] = useState(false);
  const [isInlinePortfolioEditing, setIsInlinePortfolioEditing] = useState(false);
  const [isInlineCvEditing, setIsInlineCvEditing] = useState(false);
  const inlinePortfolioInputRef = useRef<HTMLInputElement | null>(null);
  const modalPortfolioInputRef = useRef<HTMLInputElement | null>(null);
  const inlineCvInputRef = useRef<HTMLInputElement | null>(null);
  const modalCvInputRef = useRef<HTMLInputElement | null>(null);

  const savedIdSet = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);
  const inspiredIdSet = useMemo(() => new Set(inspiredProjectIds), [inspiredProjectIds]);
  const fallbackPassportPath = `/c/${userId}`;
  const passportPath = profile.passportSlug ? `/passport/${profile.passportSlug}` : fallbackPassportPath;

  const featuredProject = useMemo(
    () =>
      ownProjects.find((project) => project.isFeatured) ??
      [...ownProjects].sort((a, b) => toProjectEngagementScore(b) - toProjectEngagementScore(a))[0] ??
      null,
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

  useEffect(() => {
    if (!isPassportSlugEditing) {
      setPassportSlugDraft(profile.passportSlug ?? "");
      setPassportSlugError(null);
      setPassportSlugSuccess(null);
    }
  }, [isPassportSlugEditing, profile.passportSlug]);

  const copyPassportLink = async () => {
    setCopyStatus("idle");
    const passportUrl =
      typeof window !== "undefined" ? `${window.location.origin}${passportPath}` : passportPath;

    try {
      await navigator.clipboard.writeText(passportUrl);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
    }
  };

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

    const profilePayload = {
      user_id: userId,
      bio: nextProfile.bio,
      contact_email: nextProfile.contactEmail || null,
      portfolio_links: nextProfile.portfolioLinks,
      passport_slug: nextProfile.passportSlug,
      profile_completion_score: parsedScore
    };

    let profileResult = await supabase.from("candidate_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (profileResult.error && isMissingPassportSlugColumn(profileResult.error.message)) {
      if ("passportSlug" in patch) {
        throw new Error("Apply the passport_slug migration before saving a custom passport path.");
      }

      const legacyProfilePayload = {
        user_id: profilePayload.user_id,
        bio: profilePayload.bio,
        contact_email: profilePayload.contact_email,
        portfolio_links: profilePayload.portfolio_links,
        profile_completion_score: profilePayload.profile_completion_score
      };
      profileResult = await supabase.from("candidate_profiles").upsert(legacyProfilePayload, { onConflict: "user_id" });
    }

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
      setIsInlineIdentityEditing(false);
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
      setIsInlinePassportEditing(false);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : "Unable to save passport.");
    } finally {
      setPassportSaving(false);
    }
  };

  const savePassportSlug = async () => {
    const normalizedSlug = normalizePassportSlug(passportSlugDraft);
    setPassportSlugError(null);
    setPassportSlugSuccess(null);

    if (normalizedSlug && !PASSPORT_SLUG_PATTERN.test(normalizedSlug)) {
      setPassportSlugError("Use lowercase letters, numbers, and hyphens only. No spaces or symbols.");
      return;
    }

    setPassportSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (normalizedSlug) {
        const { data: existingRows, error: existingError } = await supabase
          .from("candidate_profiles")
          .select("user_id")
          .eq("passport_slug", normalizedSlug)
          .limit(1);

        if (existingError) {
          throw new Error(existingError.message);
        }

        const existingUserId = (existingRows?.[0] as Record<string, unknown> | undefined)?.user_id;
        const existingOwnerId = typeof existingUserId === "string" ? existingUserId : "";
        if (existingOwnerId && existingOwnerId !== userId) {
          setPassportSlugError("That passport path is already taken.");
          return;
        }
      }

      await persistProfilePatch({ passportSlug: normalizedSlug || null });
      setPassportSlugDraft(normalizedSlug);
      setPassportSlugSuccess(normalizedSlug ? "Passport path updated." : "Custom path removed.");
      setIsPassportSlugEditing(false);
    } catch (error) {
      setPassportSlugError(error instanceof Error ? error.message : "Unable to update passport path.");
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
    if (activeSection === "dashboard") {
      const cvLink = findCvLink(profile.portfolioLinks);
      const portfolioOnlyLinks = profile.portfolioLinks.filter((link) => !isValidCvLink(link));

      return (
        <section className="space-y-8" id="section-dashboard">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
            <Card className="space-y-5 bg-transparent">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps mb-2">Profile information</p>
                  <h2 className="font-serif text-2xl text-[#16130f]">Identity</h2>
                </div>
                <IconButton
                  icon={isInlineIdentityEditing ? "x" : "pencil"}
                  label={isInlineIdentityEditing ? "Cancel profile edits" : "Edit profile information"}
                  onClick={() => {
                    if (isInlineIdentityEditing) {
                      setNameDraft(profile.name);
                      setRoleTypeDraft(profile.roleType);
                      setHeadlineDraft(profile.headline);
                      setBioDraft(profile.bio);
                      setIdentityError(null);
                      setIdentitySuccess(null);
                    }
                    setIsInlineIdentityEditing((current) => !current);
                  }}
                />
              </div>

              {isInlineIdentityEditing ? (
                <form className="space-y-4" onSubmit={saveIdentity}>
                  <label className="block space-y-2 text-sm text-ink-900">
                    Name
                    <Input onChange={(event) => setNameDraft(event.target.value)} required value={nameDraft} />
                  </label>
                  <label className="block space-y-2 text-sm text-ink-900">
                    Role
                    <select
                      className="w-full border border-[#d7cebd] bg-transparent px-3.5 py-2.5 text-sm text-[#16130f] outline-none focus:border-[#f3c945]"
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
                      className="min-h-[120px]"
                      onChange={(event) => setBioDraft(event.target.value)}
                      placeholder="Tell us about yourself. Include your background, role, and interests."
                      value={bioDraft}
                    />
                  </label>
                  {identityError ? <p className="text-sm text-red-700">{identityError}</p> : null}
                  {identitySuccess ? <p className="text-sm text-green-700">{identitySuccess}</p> : null}
                  <div className="flex justify-end">
                    <IconButton
                      disabled={identitySaving}
                      icon="check"
                      label={identitySaving ? "Saving profile information" : "Save profile information"}
                      type="submit"
                      variant="primary"
                    />
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-serif text-3xl leading-tight text-[#16130f]">
                      {profile.name || "Merit Builder"}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-[#7b705f]">
                      {profile.headline || "Add a headline so people understand what you build and where you are headed."}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="label-caps">Role</p>
                      <p className="mt-1 capitalize text-sm text-[#16130f]">{profile.roleType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="label-caps mb-2">Bio</p>
                    <p className="max-w-3xl text-base leading-7 text-[#7b705f]">
                      {profile.bio || "No bio added yet."}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-5 bg-transparent">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps mb-2">Links and signals</p>
                  <h2 className="font-serif text-2xl text-[#16130f]">Contact</h2>
                </div>
                <IconButton
                  icon={isInlinePassportEditing ? "x" : "pencil"}
                  label={isInlinePassportEditing ? "Cancel link edits" : "Edit links and signals"}
                  onClick={() => {
                    if (isInlinePassportEditing) {
                      setContactEmailDraft(profile.contactEmail);
                      setTargetRolesDraft(profile.targetRoles.join(", "));
                      setPortfolioLinksDraft(profile.portfolioLinks.filter((link) => !isValidCvLink(link)).join("\n"));
                      setCvLinkDraft(findCvLink(profile.portfolioLinks));
                      setPassportError(null);
                      setPassportSuccess(null);
                    }
                    setIsInlinePassportEditing((current) => !current);
                  }}
                />
              </div>

              {isInlinePassportEditing ? (
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
                    Target roles
                    <Input
                      onChange={(event) => setTargetRolesDraft(event.target.value)}
                      placeholder="Frontend Engineer Intern, Product Designer"
                      value={targetRolesDraft}
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-ink-900">
                    Resume link
                    <Input
                      onChange={(event) => setCvLinkDraft(event.target.value)}
                      placeholder="https://your-site.com/resume.pdf"
                      value={cvLinkDraft}
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-ink-900">
                    Social / portfolio links
                    <Textarea
                      className="min-h-[120px]"
                      onChange={(event) => setPortfolioLinksDraft(event.target.value)}
                      placeholder={"https://your-site.com\nhttps://behance.net/you"}
                      value={portfolioLinksDraft}
                    />
                  </label>
                  {passportError ? <p className="text-sm text-red-700">{passportError}</p> : null}
                  {passportSuccess ? <p className="text-sm text-green-700">{passportSuccess}</p> : null}
                  <div className="flex justify-end">
                    <IconButton
                      disabled={passportSaving || isUploadingCv || isUploadingPortfolioFiles}
                      icon="check"
                      label={passportSaving ? "Saving links and signals" : "Save links and signals"}
                      type="submit"
                      variant="primary"
                    />
                  </div>
                </form>
              ) : (
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="label-caps mb-2">Open to</p>
                    {profile.targetRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.targetRoles.map((role) => (
                          <Badge key={role}>{role}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#7b705f]">Not set yet.</p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="label-caps">Email</p>
                      <p className="mt-1 text-[#16130f]">{profile.contactEmail || "Not set"}</p>
                    </div>
                    <div>
                      <p className="label-caps">Resume</p>
                      {cvLink ? (
                        <a className="mt-1 inline-flex text-[#16130f] underline underline-offset-4" href={cvLink} rel="noreferrer" target="_blank">
                          Open Resume
                        </a>
                      ) : (
                        <p className="mt-1 text-[#7b705f]">Not set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="label-caps mb-2">Social / portfolio links</p>
                    {portfolioOnlyLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {portfolioOnlyLinks.map((link, index) => (
                          <a
                            className="inline-flex text-[#16130f] underline underline-offset-4"
                            href={link}
                            key={link}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {portfolioOnlyLinks.length === 1 ? "Open Portfolio" : `Open Portfolio ${index + 1}`}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#7b705f]">No portfolio links added yet.</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-caps mb-2">Projects</p>
                <h2 className="font-serif text-2xl text-[#16130f]">Published work</h2>
              </div>
              <Link
                aria-label="Add project"
                className={iconControlClassName({ variant: "primary" })}
                href="/projects/new"
                title="Add project"
              >
                <ActionIcon name="plus" />
              </Link>
            </div>
            <ProjectRail
              emptyText="You do not have projects yet. Publish one to activate your passport."
              projectActions={(project) => <ProjectOwnerActions projectId={project.projectId} />}
              projects={ownProjects}
            />
          </section>

          <section className="space-y-4">
            <div>
              <p className="label-caps mb-2">Saved projects</p>
              <h2 className="font-serif text-2xl text-[#16130f]">Reference shelf</h2>
            </div>
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
        </section>
      );
    }

    if (activeSection === "passport") {
      return (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" id="section-passport">
          <Card className="space-y-5 bg-transparent">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label-caps mb-2">Passport</p>
                <h2 className="font-serif text-3xl leading-tight text-[#16130f]">Public profile preview</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b705f]">
                  This is the dedicated passport surface for sharing and checking how your public profile reads.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <IconButton
                  active={copyStatus === "copied"}
                  icon={copyStatus === "copied" ? "check" : "copy"}
                  label={copyStatus === "copied" ? "Passport link copied" : "Copy passport link"}
                  onClick={copyPassportLink}
                />
                <Link
                  aria-label="View public passport"
                  className={iconControlClassName({ variant: "primary" })}
                  href={passportPath}
                  title="View public passport"
                >
                  <ActionIcon name="eye" />
                </Link>
              </div>
            </div>
            {copyStatus === "error" ? (
              <p className="text-sm text-red-700">Could not copy automatically. Open the passport and copy the URL.</p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="border border-[#d7cebd] bg-[#eee8dd] p-3">
                <p className="label-caps">Projects</p>
                <p className="mt-1 text-xl font-semibold text-[#16130f]">{ownProjects.length}</p>
              </div>
              <div className="border border-[#d7cebd] bg-[#eee8dd] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label-caps">Public path</p>
                    <p className="mt-2 truncate text-sm font-semibold text-[#16130f]">{passportPath}</p>
                    {!profile.passportSlug ? (
                      <p className="mt-1 text-xs text-[#7b705f]">Set a custom slug to replace the generated path.</p>
                    ) : null}
                  </div>
                  <IconButton
                    icon={isPassportSlugEditing ? "x" : "pencil"}
                    label={isPassportSlugEditing ? "Cancel public path edits" : "Edit public path"}
                    onClick={() => setIsPassportSlugEditing((current) => !current)}
                  />
                </div>
                {isPassportSlugEditing ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-[#7b705f]">/passport/</span>
                      <Input
                        className="min-w-[220px] flex-1"
                        onChange={(event) => setPassportSlugDraft(normalizePassportSlug(event.target.value))}
                        placeholder="ryan-flaneur"
                        value={passportSlugDraft}
                      />
                      <IconButton
                        disabled={passportSaving}
                        icon="check"
                        label={passportSaving ? "Saving public path" : "Save public path"}
                        onClick={savePassportSlug}
                        variant="primary"
                      />
                    </div>
                    <p className="text-xs text-[#7b705f]">Lowercase letters, numbers, and hyphens only.</p>
                  </div>
                ) : null}
                {passportSlugError ? <p className="mt-3 text-sm text-red-700">{passportSlugError}</p> : null}
                {passportSlugSuccess ? <p className="mt-3 text-sm text-green-700">{passportSlugSuccess}</p> : null}
              </div>
            </div>

            {featuredProject ? (
              <div className="space-y-4 border-t border-[#d7cebd] pt-5">
                <p className="label-caps">Featured work</p>
                {featuredVisual?.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`${featuredProject.title} preview`}
                    className="max-h-[360px] max-w-full object-contain"
                    src={featuredVisual.previewUrl}
                  />
                ) : null}
                <div className="max-w-3xl space-y-2">
                  <h3 className="font-serif text-2xl leading-tight text-[#16130f]">{featuredProject.title}</h3>
                  <p className="text-sm leading-6 text-[#7b705f]">{featuredProject.hook || featuredProject.problemSolved}</p>
                  <p className="text-sm leading-6 text-[#4b4439]">
                    {featuredProject.whatWasBuilt || "Add a detailed project description so passport visitors get context."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="border-t border-[#d7cebd] pt-5 text-sm text-[#7b705f]">
                Add a project to make the public passport preview feel complete.
              </p>
            )}

            <div className="space-y-4 border-t border-[#d7cebd] pt-5">
              <p className="label-caps">Skill tags</p>
              <SkillTagsToggle limit={8} skills={skillStats.map(({ skill }) => skill)} />
            </div>
          </Card>

          <Card className="space-y-4 bg-[#eee8dd]">
            <p className="label-caps">Passport card</p>
            <div className="flex h-16 w-16 items-center justify-center bg-[#dfd6c6] font-serif text-xl text-[#7b705f]">
              {(profile.name || "M")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif text-2xl leading-tight text-[#16130f]">{profile.name || "Merit Builder"}</h3>
              <p className="mt-2 text-sm leading-6 text-[#7b705f]">{profile.headline || "No headline added yet."}</p>
            </div>
            <div className="space-y-3 border-y border-[#d7cebd] py-4">
              <p className="label-caps">Open to</p>
              {profile.targetRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.targetRoles.slice(0, 4).map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7b705f]">Add target roles on Dashboard.</p>
              )}
            </div>
            <p className="text-sm leading-6 text-[#7b705f]">
              Edit profile details, resume, portfolio links, projects, and saved work from Dashboard.
            </p>
          </Card>
        </section>
      );
    }

    if (activeSection === "overview") {
      return (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" id="section-overview">
          <Card className="space-y-4 bg-transparent">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="label-caps">Your Merit right now</p>
                <h2 className="font-serif text-3xl leading-tight text-[#16130f]">
                  {profile.name || "Merit Builder"}
                </h2>
                <p className="max-w-2xl text-base leading-7 text-[#7b705f]">
                  {profile.headline || "Add a headline so people understand what you build and where you are headed."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <IconButton
                  active={copyStatus === "copied"}
                  icon={copyStatus === "copied" ? "check" : "copy"}
                  label={copyStatus === "copied" ? "Passport link copied" : "Copy passport link"}
                  onClick={copyPassportLink}
                  variant="primary"
                />
                <Link
                  aria-label="View as recruiter"
                  className={iconControlClassName()}
                  href={passportPath}
                  title="View as recruiter"
                >
                  <ActionIcon name="eye" />
                </Link>
              </div>
            </div>

            {copyStatus === "error" ? (
              <p className="text-sm text-red-700">Could not copy automatically. Open the passport and copy the URL.</p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="border border-[#d7cebd] bg-[#eee8dd] p-3">
                <p className="label-caps">Profile</p>
                <p className="mt-1 text-xl font-semibold text-[#16130f]">{profile.profileCompletionScore}%</p>
                <p className="mt-1 text-sm text-[#7b705f]">Readiness</p>
              </div>
              <div className="border border-[#d7cebd] bg-[#eee8dd] p-3">
                <p className="label-caps">Projects</p>
                <p className="mt-1 text-xl font-semibold text-[#16130f]">{ownProjects.length}</p>
                <p className="mt-1 text-sm text-[#7b705f]">Published builds</p>
              </div>
              <div className="border border-[#d7cebd] bg-[#eee8dd] p-3">
                <p className="label-caps">Share</p>
                <p className="mt-2 truncate text-sm font-semibold text-[#16130f]">{passportPath}</p>
                <p className="mt-1 text-sm text-[#7b705f]">Public passport</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#d7cebd] pt-4">
              <IconButton icon="pencil" label="Edit profile basics" onClick={() => setActiveSection("profile")} />
              <IconButton icon="folder" label="Manage projects" onClick={() => setActiveSection("projects")} />
              <Link
                aria-label="Add project"
                className={iconControlClassName({ variant: "primary" })}
                href="/projects/new"
                title="Add project"
              >
                <ActionIcon name="plus" />
              </Link>
            </div>
          </Card>

          <Card className="space-y-4 bg-[#eee8dd]">
            <div className="space-y-2">
              <p className="label-caps">Passport preview</p>
              <div className="h-16 w-16 border border-[#d7cebd] bg-[#ded6c7] p-3 font-serif text-xl text-[#7b705f]">
                {(profile.name || "M")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <h3 className="font-serif text-2xl leading-tight text-[#16130f]">
                {profile.name || "Merit Builder"}
              </h3>
              <p className="text-sm leading-6 text-[#7b705f]">{profile.headline || "No headline added yet."}</p>
            </div>

            <div className="space-y-3 border-y border-[#d7cebd] py-4">
              <p className="label-caps">Open to</p>
              {profile.targetRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.targetRoles.slice(0, 4).map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7b705f]">Add target roles to clarify your direction.</p>
              )}
            </div>

            {featuredProject ? (
              <div className="space-y-2">
                <p className="label-caps">Featured evidence</p>
                <p className="font-serif text-xl leading-tight text-[#16130f]">{featuredProject.title}</p>
                <p className="line-clamp-2 text-sm leading-6 text-[#7b705f]">
                  {featuredProject.hook || featuredProject.problemSolved}
                </p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#7b705f]">Add a project to make the preview feel complete.</p>
            )}
          </Card>
        </section>
      );
    }

    if (activeSection === "profile") {
      return (
        <section className="grid gap-4 xl:grid-cols-2" id="section-profile">
          <Card className="space-y-4 bg-transparent">
            <div>
              <p className="label-caps mb-2">Edit profile</p>
              <h2 className="font-serif text-2xl text-[#16130f]">Profile basics</h2>
            </div>
            <form className="space-y-4" onSubmit={saveIdentity}>
              <label className="block space-y-2 text-sm text-ink-900">
                Name
                <Input onChange={(event) => setNameDraft(event.target.value)} required value={nameDraft} />
              </label>
              <label className="block space-y-2 text-sm text-ink-900">
                Role
                <select
                  className="w-full border border-[#d7cebd] bg-transparent px-3.5 py-2.5 text-sm text-[#16130f] outline-none focus:border-[#f3c945]"
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
                  className="min-h-[120px]"
                  onChange={(event) => setBioDraft(event.target.value)}
                  placeholder="Tell us about yourself. Include your background, role, and interests."
                  value={bioDraft}
                />
              </label>
              {identityError ? <p className="text-sm text-red-700">{identityError}</p> : null}
              {identitySuccess ? <p className="text-sm text-green-700">{identitySuccess}</p> : null}
              <IconButton
                disabled={identitySaving}
                icon="check"
                label={identitySaving ? "Saving profile basics" : "Save profile basics"}
                type="submit"
                variant="primary"
              />
            </form>
          </Card>

          <Card className="space-y-4 bg-transparent">
            <div>
              <p className="label-caps mb-2">Passport details</p>
              <h2 className="font-serif text-2xl text-[#16130f]">Contact and evidence</h2>
            </div>
            <div className="grid gap-3 border border-[#d7cebd] bg-[#eee8dd] p-3 text-sm sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="label-caps">Readiness</p>
                  <p className="mt-1 font-semibold text-[#16130f]">{profile.profileCompletionScore}%</p>
                </div>
                <div>
                  <p className="label-caps">Role</p>
                  <p className="mt-1 capitalize text-[#16130f]">{profile.roleType}</p>
                </div>
                <div>
                  <p className="label-caps">Open to</p>
                  <p className="mt-1 truncate text-[#16130f]">
                    {profile.targetRoles.length > 0 ? profile.targetRoles.slice(0, 2).join(" / ") : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconButton
                  active={copyStatus === "copied"}
                  icon={copyStatus === "copied" ? "check" : "copy"}
                  label={copyStatus === "copied" ? "Passport link copied" : "Copy passport link"}
                  onClick={copyPassportLink}
                />
                <Link
                  aria-label="View public passport"
                  className={iconControlClassName()}
                  href={passportPath}
                  title="View public passport"
                >
                  <ActionIcon name="eye" />
                </Link>
              </div>
            </div>
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
                Target roles
                <Input
                  onChange={(event) => setTargetRolesDraft(event.target.value)}
                  placeholder="Frontend Engineer Intern, Product Designer"
                  value={targetRolesDraft}
                />
              </label>
              <label className="block space-y-2 text-sm text-ink-900">
                CV / Resume link
                <Input
                  onChange={(event) => setCvLinkDraft(event.target.value)}
                  placeholder="https://your-site.com/resume.pdf"
                  value={cvLinkDraft}
                />
              </label>
              <label className="block space-y-2 text-sm text-ink-900">
                Portfolio links
                <Textarea
                  className="min-h-[120px]"
                  onChange={(event) => setPortfolioLinksDraft(event.target.value)}
                  placeholder={"https://your-site.com\nhttps://behance.net/you"}
                  value={portfolioLinksDraft}
                />
              </label>
              {passportError ? <p className="text-sm text-red-700">{passportError}</p> : null}
              {passportSuccess ? <p className="text-sm text-green-700">{passportSuccess}</p> : null}
              <div className="flex flex-wrap gap-2">
                <IconButton
                  disabled={passportSaving || isUploadingCv || isUploadingPortfolioFiles}
                  icon="check"
                  label={passportSaving ? "Saving passport details" : "Save passport details"}
                  type="submit"
                  variant="primary"
                />
                <IconButton icon="upload" label="Portfolio uploads" onClick={() => setActiveSection("portfolio")} />
                <IconButton icon="upload" label="CV uploads" onClick={() => setActiveSection("cv")} />
              </div>
            </form>
          </Card>
        </section>
      );
    }

    if (activeSection === "projects") {
      return (
        <section className="space-y-4" id="section-projects">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Published projects</h2>
            <Link
              aria-label="Add project"
              className={iconControlClassName({ variant: "primary" })}
              href="/projects/new"
              title="Add project"
            >
              <ActionIcon name="plus" />
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
                <IconButton
                  disabled={passportSaving || isUploadingPortfolioFiles}
                  icon="check"
                  label={passportSaving ? "Saving links" : "Save links"}
                  onClick={saveInlinePortfolioLinks}
                  variant="primary"
                />
                <IconButton
                  icon="x"
                  label="Cancel portfolio edits"
                  onClick={() => {
                    setIsInlinePortfolioEditing(false);
                    setPortfolioLinksDraft(profile.portfolioLinks.filter((link) => !isValidCvLink(link)).join("\n"));
                  }}
                />
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
                    aria-label="Open portfolio in new tab"
                    className={iconControlClassName()}
                    href={selectedPortfolioLink}
                    rel="noreferrer"
                    target="_blank"
                    title="Open portfolio in new tab"
                  >
                    <ActionIcon name="external" />
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
                <IconButton
                  disabled={passportSaving || isUploadingCv}
                  icon="check"
                  label={passportSaving ? "Saving CV or resume" : "Save CV or resume"}
                  onClick={saveInlineCv}
                  variant="primary"
                />
                <IconButton icon="x" label="Cancel CV edits" onClick={() => setIsInlineCvEditing(false)} />
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
                  aria-label="Open CV in new tab"
                  className={iconControlClassName()}
                  href={cvLink}
                  rel="noreferrer"
                  target="_blank"
                  title="Open CV in new tab"
                >
                  <ActionIcon name="external" />
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
      <section className="editorial-container py-8">
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="hidden pt-3 lg:block">
          <nav className="sticky top-24 space-y-5 text-sm">
            {sections.map((section) => (
              <button
                className={`block text-left transition-colors ${
                  activeSection === section.id ? "text-[#16130f]" : "text-[#7b705f] hover:text-[#16130f]"
                }`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d7cebd] pb-5">
            <div className="space-y-2">
              <p className="label-caps">{activeSection === "passport" ? "Passport" : "Dashboard"}</p>
              <h1 className="font-serif text-3xl leading-none text-[#16130f]">
                {activeSection === "passport" ? "Public passport" : "Merit workspace"}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[#7b705f]">
                {activeSection === "passport"
                  ? "Preview and share the public-facing version of your Merit profile."
                  : "Manage your profile, project proof, resume, portfolio links, and saved references in one place."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <IconButton
                active={copyStatus === "copied"}
                icon={copyStatus === "copied" ? "check" : "copy"}
                label={copyStatus === "copied" ? "Passport link copied" : "Copy passport link"}
                onClick={copyPassportLink}
              />
              <Link
                aria-label="View passport"
                className={iconControlClassName({ variant: "primary" })}
                href={passportPath}
                title="View passport"
              >
                <ActionIcon name="eye" />
              </Link>
            </div>
          </header>

      <Card className="sticky top-16 z-20 border-[#d7cebd] bg-[#f4f0e8]/95 p-3 backdrop-blur lg:hidden">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {sections.map((section) => (
              <button
                className={`rounded-none border px-4 py-2 text-sm transition ${
                  activeSection === section.id
                    ? "border-[#f3c945] bg-[#f3c945] text-[#16130f]"
                    : "border-[#16130f] bg-transparent text-[#16130f]"
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
            <IconButton icon="x" label="Cancel identity edits" onClick={() => setIdentityModalOpen(false)} variant="ghost" />
            <IconButton
              disabled={identitySaving}
              icon="check"
              label={identitySaving ? "Saving identity" : "Save identity"}
              type="submit"
              variant="primary"
            />
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
            <IconButton icon="x" label="Cancel passport edits" onClick={() => setPassportModalOpen(false)} />
            <IconButton
              disabled={passportSaving || isUploadingCv || isUploadingPortfolioFiles}
              icon="check"
              label={passportSaving ? "Saving passport" : "Save passport"}
              type="submit"
              variant="primary"
            />
          </div>
        </form>
      </ProfileModal>
        </div>
      </div>
    </section>
  );
}
