"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { captureServerAnalyticsEvent } from "@/lib/analytics/posthog-server";
import { buildClaimPassportUrl, resolveClaimLinkBaseUrl } from "@/lib/auth/claim-links";
import {
  createClaimablePassport,
  deleteClaimablePassport,
  normalizeOptionalText,
  normalizeOptionalUrl,
  normalizePassportSlug,
  normalizeRequiredText,
  parseSkillsInput,
  regenerateClaimToken,
  updateClaimablePassport,
  validatePassportSlug,
  type ClaimablePassportFeaturedWork,
  type ClaimablePassportProject
} from "@/lib/db/claimable-passports";
import { resolveSafeAuthNext } from "@/lib/auth/auth-urls";
import { getPublicAppUrl } from "@/lib/public-config";
import { isAdminEmail } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminPassportActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  claimLink: string | null;
  passportId: string | null;
};

async function requireAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(resolveSafeAuthNext("/admin/passports"))}`);
  }
  if (!isAdminEmail(user.email)) {
    throw new Error("Admin access required.");
  }
  return user;
}

async function getRequestBaseUrl() {
  const headerStore = await headers();
  return resolveClaimLinkBaseUrl({
    fallbackSiteUrl: getPublicAppUrl(),
    fallbackViteSiteUrl: process.env.VITE_SITE_URL,
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
    origin: headerStore.get("origin"),
    referer: headerStore.get("referer")
  });
}

async function buildClaimLink(token: string) {
  const baseUrl = await getRequestBaseUrl();
  return buildClaimPassportUrl(token, baseUrl);
}

function normalizeFormUrl(formData: FormData, key: string, label: string) {
  const raw = formData.get(key);
  const value = normalizeOptionalUrl(raw);
  if (typeof raw === "string" && raw.trim().length > 0 && !value) {
    throw new Error(`${label} must be an http(s) URL.`);
  }
  return value;
}

function parseFeaturedWork(formData: FormData): ClaimablePassportFeaturedWork | null {
  const title = normalizeOptionalText(formData.get("featuredWorkTitle"));
  const description = normalizeOptionalText(formData.get("featuredWorkDescription"));
  if (!title && !description) {
    return null;
  }
  return {
    title: title ?? "Featured work",
    description: description ?? ""
  };
}

function getStringValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""));
}

function normalizeIndexedUrlList(values: string[], index: number, label: string) {
  const raw = values[index] ?? "";
  const entries = raw
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      entries.map((entry, entryIndex) => {
        const value = normalizeOptionalUrl(entry);
        if (!value) {
          throw new Error(`${label}${entries.length > 1 ? ` ${entryIndex + 1}` : ""} must be an http(s) URL.`);
        }
        return value;
      })
    )
  );
}

function parseProjectEntries(formData: FormData, featuredWork: ClaimablePassportFeaturedWork | null): ClaimablePassportProject[] {
  const titles = getStringValues(formData, "projectTitle");
  const hooks = getStringValues(formData, "projectHook");
  const descriptions = getStringValues(formData, "projectDescription");
  const categories = getStringValues(formData, "projectCategory");
  const skills = getStringValues(formData, "projectSkills");
  const links = getStringValues(formData, "projectLink");
  const images = getStringValues(formData, "projectImageUrl");

  const projects = titles
    .map((title, index) => {
      const normalizedTitle = title.trim().replace(/\s+/g, " ");
      if (!normalizedTitle) {
        return null;
      }
      const description = descriptions[index]?.trim() || hooks[index]?.trim() || normalizedTitle;
      const artifactUrls = normalizeIndexedUrlList(links, index, "Project link");
      const imageUrls = normalizeIndexedUrlList(images, index, "Project image URL");
      const project: ClaimablePassportProject = {
        title: normalizedTitle,
        hook: (hooks[index]?.trim() || description || normalizedTitle).slice(0, 140),
        category: categories[index]?.trim() || "Portfolio",
        description,
        skills: parseSkillsInput(skills[index] ?? ""),
        artifactUrl: artifactUrls[0] ?? null,
        artifactUrls,
        imageUrl: imageUrls[0] ?? null,
        imageUrls
      };
      return project;
    })
    .filter((project): project is ClaimablePassportProject => Boolean(project));

  if (projects.length > 0 || !featuredWork) {
    return projects;
  }

  return [
    {
      title: featuredWork.title,
      hook: featuredWork.description.slice(0, 140) || featuredWork.title,
      category: "Portfolio",
      description: featuredWork.description || featuredWork.title,
      skills: [],
      artifactUrl: null,
      artifactUrls: [],
      imageUrl: null,
      imageUrls: []
    }
  ];
}

export async function createAdminPassportAction(
  _previousState: AdminPassportActionState,
  formData: FormData
): Promise<AdminPassportActionState> {
  try {
    const user = await requireAdminUser();
    const featuredWork = parseFeaturedWork(formData);
    const passportSlug = normalizePassportSlug(formData.get("passportSlug"));
    validatePassportSlug(passportSlug);

    const { passport, claimToken } = await createClaimablePassport(
      {
        fullName: normalizeRequiredText(formData.get("fullName"), "Full name"),
        headline: normalizeOptionalText(formData.get("headline")),
        bio: normalizeOptionalText(formData.get("bio")),
        email: normalizeOptionalText(formData.get("email")),
        school: normalizeOptionalText(formData.get("course")),
        skills: parseSkillsInput(formData.get("skills")),
        projects: parseProjectEntries(formData, featuredWork),
        featuredWork,
        resumeUrl: normalizeFormUrl(formData, "resumeUrl", "Resume link"),
        portfolioUrl: normalizeFormUrl(formData, "portfolioUrl", "Portfolio link"),
        linkedinUrl: normalizeFormUrl(formData, "linkedinUrl", "LinkedIn link"),
        githubUrl: normalizeFormUrl(formData, "githubUrl", "GitHub link"),
        passportSlug
      },
      user.id
    );

    await captureServerAnalyticsEvent("passport_created", user.id, {
      ownerId: passport.ownerUserId,
      passportId: passport.passportId,
      passport_slug: passport.passportSlug,
      projectCount: passport.projects.length,
      source: "admin_passports",
      timestamp: new Date().toISOString(),
      userId: user.id
    });

    return {
      status: "success",
      message: "Unclaimed Passport created. Copy this claim link now; the raw token is not stored.",
      claimLink: await buildClaimLink(claimToken),
      passportId: passport.passportId
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to create Passport.",
      claimLink: null,
      passportId: null
    };
  }
}

export async function regenerateAdminPassportClaimLinkAction(
  _previousState: AdminPassportActionState,
  formData: FormData
): Promise<AdminPassportActionState> {
  try {
    await requireAdminUser();
    const passportId = normalizeRequiredText(formData.get("passportId"), "Passport id");
    const { passport, claimToken } = await regenerateClaimToken(passportId);
    return {
      status: "success",
      message: `New claim link generated for ${passport.fullName}. Copy it now; it expires in 3 days.`,
      claimLink: await buildClaimLink(claimToken),
      passportId: passport.passportId
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to regenerate claim link.",
      claimLink: null,
      passportId: null
    };
  }
}

export async function updateAdminPassportAction(
  _previousState: AdminPassportActionState,
  formData: FormData
): Promise<AdminPassportActionState> {
  try {
    const user = await requireAdminUser();
    const passportId = normalizeRequiredText(formData.get("passportId"), "Passport id");
    const featuredWork = parseFeaturedWork(formData);
    const passportSlug = normalizePassportSlug(formData.get("passportSlug"));
    validatePassportSlug(passportSlug);

    const passport = await updateClaimablePassport(passportId, {
      fullName: normalizeRequiredText(formData.get("fullName"), "Full name"),
      headline: normalizeOptionalText(formData.get("headline")),
      bio: normalizeOptionalText(formData.get("bio")),
      email: normalizeOptionalText(formData.get("email")),
      school: normalizeOptionalText(formData.get("course")),
      skills: parseSkillsInput(formData.get("skills")),
      projects: parseProjectEntries(formData, featuredWork),
      featuredWork,
      resumeUrl: normalizeFormUrl(formData, "resumeUrl", "Resume link"),
      portfolioUrl: normalizeFormUrl(formData, "portfolioUrl", "Portfolio link"),
      linkedinUrl: normalizeFormUrl(formData, "linkedinUrl", "LinkedIn link"),
      githubUrl: normalizeFormUrl(formData, "githubUrl", "GitHub link"),
      passportSlug
    });

    await captureServerAnalyticsEvent("passport_updated", user.id, {
      ownerId: passport.ownerUserId,
      passportId: passport.passportId,
      passport_slug: passport.passportSlug,
      projectCount: passport.projects.length,
      source: "admin_passports",
      timestamp: new Date().toISOString(),
      userId: user.id
    });

    return {
      status: "success",
      message: `${passport.fullName} updated.`,
      claimLink: null,
      passportId: passport.passportId
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to update Passport.",
      claimLink: null,
      passportId: null
    };
  }
}

export async function deleteAdminPassportAction(
  _previousState: AdminPassportActionState,
  formData: FormData
): Promise<AdminPassportActionState> {
  try {
    await requireAdminUser();
    const passportId = normalizeRequiredText(formData.get("passportId"), "Passport id");
    await deleteClaimablePassport(passportId);

    return {
      status: "success",
      message: "Passport deleted. Public Passport path and any existing claim link are now unavailable.",
      claimLink: null,
      passportId
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to delete Passport.",
      claimLink: null,
      passportId: null
    };
  }
}
