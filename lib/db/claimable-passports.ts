import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;
type UnclaimedPassportRow = Database["public"]["Tables"]["unclaimed_passports"]["Row"];
type UnclaimedPassportInsert = Database["public"]["Tables"]["unclaimed_passports"]["Insert"];

export type ClaimablePassportStatus = "unclaimed" | "claimed" | "expired";

export type ClaimablePassportProject = {
  title: string;
  hook: string;
  category: string;
  description: string;
  skills: string[];
  artifactUrl: string | null;
  imageUrl: string | null;
};

export type ClaimablePassportFeaturedWork = {
  title: string;
  description: string;
};

export type ClaimablePassport = {
  passportId: string;
  ownerUserId: string | null;
  createdByAdminId: string | null;
  fullName: string;
  headline: string | null;
  bio: string | null;
  email: string | null;
  school: string | null;
  skills: string[];
  projects: ClaimablePassportProject[];
  featuredWork: ClaimablePassportFeaturedWork | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  passportSlug: string | null;
  claimExpiresAt: string;
  claimedAt: string | null;
  status: ClaimablePassportStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateClaimablePassportInput = {
  fullName: string;
  headline: string | null;
  bio: string | null;
  email: string | null;
  school: string | null;
  skills: string[];
  projects: ClaimablePassportProject[];
  featuredWork: ClaimablePassportFeaturedWork | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  passportSlug: string | null;
};

export type ClaimLookupResult = {
  passport: ClaimablePassport | null;
  state: "valid" | "invalid" | "expired" | "claimed";
};

const CLAIM_LINK_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const PASSPORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapProjects(value: unknown): ClaimablePassportProject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const title = normalizeText(safeString(entry.title));
      if (!title) {
        return null;
      }
      const description = safeString(entry.description).trim();
      return {
        title,
        hook: safeString(entry.hook).trim().slice(0, 140) || title,
        category: normalizeText(safeString(entry.category)) || "Portfolio",
        description: description || title,
        skills: safeStringArray(entry.skills).map(normalizeText).filter(Boolean),
        artifactUrl: safeNullableString(entry.artifactUrl),
        imageUrl: safeNullableString(entry.imageUrl)
      };
    })
    .filter((entry): entry is ClaimablePassportProject => Boolean(entry));
}

function mapFeaturedWork(value: unknown): ClaimablePassportFeaturedWork | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = normalizeText(safeString(value.title));
  const description = safeString(value.description).trim();
  if (!title && !description) {
    return null;
  }
  return {
    title: title || "Featured work",
    description
  };
}

function mapPassport(row: UnclaimedPassportRow): ClaimablePassport {
  return {
    passportId: row.passport_id,
    ownerUserId: row.owner_user_id,
    createdByAdminId: row.created_by_admin_id,
    fullName: row.full_name,
    headline: row.headline,
    bio: row.bio,
    email: row.email,
    school: row.school,
    skills: safeStringArray(row.skills),
    projects: mapProjects(row.projects),
    featuredWork: mapFeaturedWork(row.featured_work),
    resumeUrl: row.resume_url,
    portfolioUrl: row.portfolio_url,
    linkedinUrl: row.linkedin_url,
    githubUrl: row.github_url,
    passportSlug: row.passport_slug,
    claimExpiresAt: row.claim_expires_at,
    claimedAt: row.claimed_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRequiredText(value: FormDataEntryValue | null, label: string) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

export function normalizeOptionalUrl(value: FormDataEntryValue | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizePassportSlug(value: FormDataEntryValue | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function validatePassportSlug(slug: string | null) {
  if (!slug) {
    return;
  }
  if (slug.length < 3 || slug.length > 40 || !PASSPORT_SLUG_PATTERN.test(slug)) {
    throw new Error("Passport slug must be 3-40 lowercase letters, numbers, or hyphens.");
  }
}

export function parseSkillsInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((entry) => normalizeText(entry))
        .filter(Boolean)
    )
  );
}

export function parseProjectInput(value: FormDataEntryValue | null, featuredWork: ClaimablePassportFeaturedWork | null) {
  const projects =
    typeof value === "string"
      ? value
          .split(/\n+/)
          .map((entry) => normalizeText(entry))
          .filter(Boolean)
          .map((title, index) => ({
            title,
            hook: index === 0 && featuredWork?.description ? featuredWork.description.slice(0, 140) : title,
            category: "Portfolio",
            description: index === 0 && featuredWork?.description ? featuredWork.description : title,
            skills: [],
            artifactUrl: null,
            imageUrl: null
          }))
      : [];

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
      imageUrl: null
    }
  ];
}

export function generateClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function hashClaimToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getClaimExpiryDate() {
  return new Date(Date.now() + CLAIM_LINK_TTL_MS);
}

async function assertPassportSlugAvailable(
  adminClient: AdminClient,
  slug: string | null,
  ignorePassportId?: string
) {
  if (!slug) {
    return;
  }

  validatePassportSlug(slug);

  const [profileResult, passportResult] = await Promise.all([
    adminClient
      .from("candidate_profiles")
      .select("user_id")
      .eq("passport_slug", slug)
      .limit(1),
    (() => {
      let query = adminClient
        .from("unclaimed_passports")
        .select("passport_id")
        .eq("passport_slug", slug)
        .limit(1);
      if (ignorePassportId) {
        query = query.neq("passport_id", ignorePassportId);
      }
      return query;
    })()
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to check claimed Passport slug: ${profileResult.error.message}`);
  }
  if (passportResult.error) {
    throw new Error(`Failed to check unclaimed Passport slug: ${passportResult.error.message}`);
  }
  if ((profileResult.data ?? []).length > 0 || (passportResult.data ?? []).length > 0) {
    throw new Error("That Passport path is already taken.");
  }
}

export async function listClaimablePassports() {
  const adminClient = createAdminSupabaseClient();
  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to list claimable Passports: ${error.message}`);
  }

  return (data ?? []).map(mapPassport);
}

export async function createClaimablePassport(
  input: CreateClaimablePassportInput,
  adminUserId: string
) {
  const adminClient = createAdminSupabaseClient();
  const slug = input.passportSlug;
  await assertPassportSlugAvailable(adminClient, slug);

  const claimToken = generateClaimToken();
  const payload: UnclaimedPassportInsert = {
    created_by_admin_id: adminUserId,
    full_name: input.fullName,
    headline: input.headline,
    bio: input.bio,
    email: input.email,
    school: input.school,
    skills: input.skills,
    projects: input.projects,
    featured_work: input.featuredWork,
    resume_url: input.resumeUrl,
    portfolio_url: input.portfolioUrl,
    linkedin_url: input.linkedinUrl,
    github_url: input.githubUrl,
    passport_slug: slug,
    claim_token_hash: hashClaimToken(claimToken),
    claim_expires_at: getClaimExpiryDate().toISOString(),
    status: "unclaimed"
  };

  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create claimable Passport: ${error.message}`);
  }

  return {
    passport: mapPassport(data),
    claimToken
  };
}

export async function regenerateClaimToken(passportId: string) {
  const adminClient = createAdminSupabaseClient();
  const claimToken = generateClaimToken();
  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .update({
      claim_token_hash: hashClaimToken(claimToken),
      claim_expires_at: getClaimExpiryDate().toISOString(),
      status: "unclaimed"
    })
    .eq("passport_id", passportId)
    .neq("status", "claimed")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to regenerate claim link: ${error.message}`);
  }
  if (!data) {
    throw new Error("This Passport is already claimed or does not exist.");
  }

  return {
    passport: mapPassport(data),
    claimToken
  };
}

export async function updateClaimablePassport(
  passportId: string,
  input: CreateClaimablePassportInput
) {
  const adminClient = createAdminSupabaseClient();
  const slug = input.passportSlug;
  await assertPassportSlugAvailable(adminClient, slug, passportId);

  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .update({
      full_name: input.fullName,
      headline: input.headline,
      bio: input.bio,
      email: input.email,
      school: input.school,
      skills: input.skills,
      projects: input.projects,
      featured_work: input.featuredWork,
      resume_url: input.resumeUrl,
      portfolio_url: input.portfolioUrl,
      linkedin_url: input.linkedinUrl,
      github_url: input.githubUrl,
      passport_slug: slug
    })
    .eq("passport_id", passportId)
    .neq("status", "claimed")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update claimable Passport: ${error.message}`);
  }
  if (!data) {
    throw new Error("Claimed Passports are already owned and cannot be edited here.");
  }

  return mapPassport(data);
}

export async function deleteClaimablePassport(passportId: string) {
  const adminClient = createAdminSupabaseClient();
  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .delete()
    .eq("passport_id", passportId)
    .neq("status", "claimed")
    .select("passport_id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete claimable Passport: ${error.message}`);
  }
  if (!data) {
    throw new Error("Claimed Passports are already owned and cannot be deleted here.");
  }
}

export async function fetchClaimablePassportByToken(token: string): Promise<ClaimLookupResult> {
  if (!token || token.length < 32) {
    return { passport: null, state: "invalid" };
  }

  const adminClient = createAdminSupabaseClient();
  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .select("*")
    .eq("claim_token_hash", hashClaimToken(token))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load claimable Passport: ${error.message}`);
  }
  if (!data) {
    return { passport: null, state: "invalid" };
  }

  const passport = mapPassport(data);
  if (passport.status === "claimed") {
    return { passport, state: "claimed" };
  }
  if (passport.status === "expired" || new Date(passport.claimExpiresAt).getTime() <= Date.now()) {
    if (passport.status === "unclaimed") {
      await adminClient
        .from("unclaimed_passports")
        .update({ status: "expired" })
        .eq("passport_id", passport.passportId)
        .eq("status", "unclaimed");
    }
    return { passport: { ...passport, status: "expired" }, state: "expired" };
  }

  return { passport, state: "valid" };
}

function deriveUserName(authUser: User) {
  const metadataName = authUser.user_metadata.name ?? authUser.user_metadata.full_name;
  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }
  if (authUser.email?.includes("@")) {
    return authUser.email.split("@")[0];
  }
  return "Merit User";
}

function resolvePortfolioLinks(passport: ClaimablePassport) {
  return [
    passport.resumeUrl,
    passport.portfolioUrl,
    passport.linkedinUrl,
    passport.githubUrl
  ].filter((link): link is string => Boolean(link));
}

async function resolveSkillIds(adminClient: AdminClient, skillNames: string[]) {
  const skillIds: string[] = [];
  for (const skillName of skillNames) {
    const { data: existingSkill, error: existingError } = await adminClient
      .from("skill_tags")
      .select("skill_id")
      .eq("skill_name", skillName)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check skill tag: ${existingError.message}`);
    }
    if (existingSkill?.skill_id) {
      skillIds.push(existingSkill.skill_id);
      continue;
    }

    const { data: insertedSkill, error: insertError } = await adminClient
      .from("skill_tags")
      .insert({ skill_name: skillName })
      .select("skill_id")
      .single();

    if (insertError) {
      const { data: racedSkill, error: racedError } = await adminClient
        .from("skill_tags")
        .select("skill_id")
        .eq("skill_name", skillName)
        .single();
      if (racedError || !racedSkill?.skill_id) {
        throw new Error(`Failed to create skill tag: ${insertError.message}`);
      }
      skillIds.push(racedSkill.skill_id);
      continue;
    }

    skillIds.push(insertedSkill.skill_id);
  }
  return skillIds;
}

async function createClaimedProjects(
  adminClient: AdminClient,
  userId: string,
  passport: ClaimablePassport
) {
  if (passport.projects.length === 0) {
    return;
  }

  for (const [index, project] of passport.projects.entries()) {
    const projectSkillIds = await resolveSkillIds(
      adminClient,
      project.skills.length > 0 ? project.skills : passport.skills
    );
    const { data: insertedProject, error: projectError } = await adminClient
      .from("projects")
      .insert({
        user_id: userId,
        title: project.title,
        hook: project.hook,
        problem_solved: project.description,
        what_was_built: project.description,
        category: project.category,
        impact: null,
        project_type: "other",
        cover_image_url: project.imageUrl,
        is_featured: index === 0
      })
      .select("project_id")
      .single();

    if (projectError) {
      throw new Error(`Failed to create claimed project: ${projectError.message}`);
    }

    if (project.artifactUrl) {
      const { error: artifactError } = await adminClient.from("artifacts").insert({
        project_id: insertedProject.project_id,
        artifact_type: "link",
        artifact_url: project.artifactUrl
      });
      if (artifactError) {
        throw new Error(`Failed to attach project artifact: ${artifactError.message}`);
      }
    }

    if (projectSkillIds.length > 0) {
      const { error: skillsError } = await adminClient.from("project_skills").insert(
        projectSkillIds.map((skillId) => ({
          project_id: insertedProject.project_id,
          skill_id: skillId
        }))
      );
      if (skillsError) {
        throw new Error(`Failed to attach project skills: ${skillsError.message}`);
      }
    }
  }
}

export async function claimPassportForUser(token: string, authUser: User) {
  const lookup = await fetchClaimablePassportByToken(token);
  if (lookup.state !== "valid" || !lookup.passport) {
    throw new Error("This claim link is not available anymore.");
  }

  const passport = lookup.passport;
  const adminClient = createAdminSupabaseClient();
  await assertPassportSlugAvailable(adminClient, passport.passportSlug, passport.passportId);

  const tokenHash = hashClaimToken(token);
  const { data: claimedRow, error: claimError } = await adminClient
    .from("unclaimed_passports")
    .update({
      owner_user_id: authUser.id,
      status: "claimed",
      claimed_at: new Date().toISOString(),
      claim_token_hash: null
    })
    .eq("passport_id", passport.passportId)
    .eq("claim_token_hash", tokenHash)
    .eq("status", "unclaimed")
    .select("*")
    .maybeSingle();

  if (claimError) {
    throw new Error(`Failed to claim Passport: ${claimError.message}`);
  }
  if (!claimedRow) {
    throw new Error("This Passport was already claimed.");
  }

  const portfolioLinks = resolvePortfolioLinks(passport);
  const profileScore = calculateProfileCompletionScore({
    name: passport.fullName,
    headline: passport.headline,
    bio: passport.bio,
    contactEmail: passport.email ?? authUser.email,
    portfolioLinks,
    targetRoles: []
  });

  const { error: userError } = await adminClient.from("users").upsert(
    {
      user_id: authUser.id,
      email: authUser.email ?? passport.email ?? `${authUser.id}@placeholder.local`,
      name: passport.fullName || deriveUserName(authUser),
      headline: passport.headline,
      role_type: "candidate",
      target_roles: []
    },
    { onConflict: "user_id" }
  );
  if (userError) {
    throw new Error(`Failed to attach Passport to user: ${userError.message}`);
  }

  const { error: profileError } = await adminClient.from("candidate_profiles").upsert(
    {
      user_id: authUser.id,
      bio: passport.bio,
      contact_email: passport.email ?? authUser.email ?? null,
      portfolio_links: portfolioLinks,
      passport_slug: passport.passportSlug,
      profile_completion_score: profileScore
    },
    { onConflict: "user_id" }
  );
  if (profileError) {
    throw new Error(`Failed to create claimed Passport profile: ${profileError.message}`);
  }

  await createClaimedProjects(adminClient, authUser.id, passport);
  return mapPassport(claimedRow);
}
