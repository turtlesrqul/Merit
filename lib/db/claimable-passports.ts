import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { buildArtifactPreviewUrl, detectArtifactType } from "@/lib/artifacts";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";
import {
  generatePassportSlugFromName,
  normalizePassportSlugValue,
  validatePassportSlug
} from "@/lib/passports/slug";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export {
  generatePassportSlugFromName,
  normalizePassportSlugValue,
  validatePassportSlug
} from "@/lib/passports/slug";

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
  artifactUrls: string[];
  imageUrl: string | null;
  imageUrls: string[];
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
  claimToken?: string | null;
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

function normalizeUrlList(value: unknown, legacyValue: unknown) {
  const urls = Array.isArray(value)
    ? value
        .map((entry) => safeNullableString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];
  const legacyUrl = safeNullableString(legacyValue);
  return Array.from(new Set([legacyUrl, ...urls].filter((entry): entry is string => Boolean(entry))));
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
      const artifactUrls = normalizeUrlList(entry.artifactUrls, entry.artifactUrl);
      const imageUrls = normalizeUrlList(entry.imageUrls, entry.imageUrl);
      const project: ClaimablePassportProject = {
        title,
        hook: safeString(entry.hook).trim().slice(0, 140) || title,
        category: normalizeText(safeString(entry.category)) || "Portfolio",
        description: description || title,
        skills: safeStringArray(entry.skills).map(normalizeText).filter(Boolean),
        artifactUrl: artifactUrls[0] ?? null,
        artifactUrls,
        imageUrl: imageUrls[0] ?? null,
        imageUrls
      };
      return project;
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
  const status =
    row.status === "unclaimed" && new Date(row.claim_expires_at).getTime() <= Date.now()
      ? "expired"
      : row.status;

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
    claimToken: row.claim_public_token,
    status,
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
  return normalizePassportSlugValue(normalized);
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
            artifactUrls: [],
            imageUrl: null,
            imageUrls: []
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
      artifactUrls: [],
      imageUrl: null,
      imageUrls: []
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
  const isTaken = await isPassportSlugTaken(adminClient, slug, ignorePassportId);
  if (isTaken) {
    const suggestion = await findAvailablePassportSlug(adminClient, slug, ignorePassportId);
    throw new Error(`That Passport path is already taken. Try "${suggestion}".`);
  }
}

async function isPassportSlugTaken(
  adminClient: AdminClient,
  slug: string,
  ignorePassportId?: string
) {
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
  return (profileResult.data ?? []).length > 0 || (passportResult.data ?? []).length > 0;
}

async function findAvailablePassportSlug(
  adminClient: AdminClient,
  requestedSlug: string,
  ignorePassportId?: string
) {
  const baseSlug = requestedSlug.slice(0, 72).replace(/-+$/g, "") || "student-passport";
  validatePassportSlug(baseSlug);

  if (!(await isPassportSlugTaken(adminClient, baseSlug, ignorePassportId))) {
    return baseSlug;
  }

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    validatePassportSlug(candidate);
    if (!(await isPassportSlugTaken(adminClient, candidate, ignorePassportId))) {
      return candidate;
    }
  }

  throw new Error(`Could not find an available Passport path for "${requestedSlug}".`);
}

async function resolveCreatePassportSlug(adminClient: AdminClient, input: CreateClaimablePassportInput) {
  if (input.passportSlug) {
    await assertPassportSlugAvailable(adminClient, input.passportSlug);
    return input.passportSlug;
  }

  return findAvailablePassportSlug(adminClient, generatePassportSlugFromName(input.fullName));
}

async function resolveUpdatePassportSlug(
  adminClient: AdminClient,
  passportId: string,
  input: CreateClaimablePassportInput
) {
  if (input.passportSlug) {
    await assertPassportSlugAvailable(adminClient, input.passportSlug, passportId);
    return input.passportSlug;
  }

  return findAvailablePassportSlug(adminClient, generatePassportSlugFromName(input.fullName), passportId);
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
  const slug = await resolveCreatePassportSlug(adminClient, input);

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
    claim_public_token: claimToken,
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
      claim_public_token: claimToken,
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
  const slug = await resolveUpdatePassportSlug(adminClient, passportId, input);

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
  const { data: passport, error: lookupError } = await adminClient
    .from("unclaimed_passports")
    .select("passport_id, owner_user_id, passport_slug, status")
    .eq("passport_id", passportId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load Passport before deletion: ${lookupError.message}`);
  }
  if (!passport) {
    throw new Error("Passport does not exist.");
  }

  if (passport.owner_user_id) {
    const { error: profileError } = await adminClient
      .from("candidate_profiles")
      .delete()
      .eq("user_id", passport.owner_user_id);
    if (profileError) {
      throw new Error(`Failed to delete claimed Passport profile: ${profileError.message}`);
    }
  }

  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .delete()
    .eq("passport_id", passportId)
    .select("passport_id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete claimable Passport: ${error.message}`);
  }
  if (!data) {
    throw new Error("Passport does not exist.");
  }
}

export async function fetchClaimablePassportBySlug(slug: string): Promise<ClaimablePassport | null> {
  validatePassportSlug(slug);

  const adminClient = createAdminSupabaseClient();
  const { data, error } = await adminClient
    .from("unclaimed_passports")
    .select("*")
    .eq("passport_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load public pre-claim Passport: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return mapPassport(data);
}

export async function fetchClaimablePassportByToken(token: string): Promise<ClaimLookupResult> {
  if (!token || token.length < 32) {
    return { passport: null, state: "invalid" };
  }

  const adminClient = createAdminSupabaseClient();
  const tokenHash = hashClaimToken(token);
  let lookupResult = await adminClient
    .from("unclaimed_passports")
    .select("*")
    .eq("claim_token_hash", tokenHash)
    .maybeSingle();

  if (!lookupResult.data && !lookupResult.error) {
    lookupResult = await adminClient
      .from("unclaimed_passports")
      .select("*")
      .eq("claim_public_token", token)
      .maybeSingle();
  }

  const { data, error } = lookupResult;

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

function projectTypeForCategory(category: string): "web" | "design" | "document" | "other" {
  const normalized = category.toLowerCase();
  if (/\b(web|website|mobile|app|dashboard|software|data)\b/.test(normalized)) {
    return "web";
  }
  if (/\b(deck|presentation|document|editorial|layout)\b/.test(normalized)) {
    return "document";
  }
  if (/\b(design|poster|branding|identity|fashion|moodboard|photography|media|ui|ux)\b/.test(normalized)) {
    return "design";
  }
  return "other";
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
    const coverImageUrl = project.imageUrls[0] ?? project.imageUrl;
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
        project_type: projectTypeForCategory(project.category),
        cover_image_url: coverImageUrl,
        is_featured: index === 0
      })
      .select("project_id")
      .single();

    if (projectError) {
      throw new Error(`Failed to create claimed project: ${projectError.message}`);
    }

    const imageUrlSet = new Set(project.imageUrls);
    const artifactUrls = Array.from(new Set([...project.artifactUrls, ...project.imageUrls]));
    if (artifactUrls.length > 0) {
      const { error: artifactError } = await adminClient.from("artifacts").insert(
        artifactUrls.map((artifactUrl) => {
          const artifactType = imageUrlSet.has(artifactUrl) ? "image" : detectArtifactType(artifactUrl);
          return {
            project_id: insertedProject.project_id,
            artifact_type: artifactType,
            artifact_url: artifactUrl,
            preview_url: buildArtifactPreviewUrl(artifactUrl, artifactType)
          };
        })
      );
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

  const portfolioLinks = resolvePortfolioLinks(passport);
  const profileScore = calculateProfileCompletionScore({
    name: passport.fullName,
    headline: passport.headline,
    bio: passport.bio,
    contactEmail: passport.email ?? authUser.email,
    portfolioLinks,
    targetRoles: []
  });
  const ownerEmail = authUser.email ?? passport.email ?? `${authUser.id}@placeholder.local`;

  const { error: ownerError } = await adminClient.from("users").upsert(
    {
      user_id: authUser.id,
      email: ownerEmail,
      name: deriveUserName(authUser),
      role_type: "candidate",
      target_roles: []
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (ownerError) {
    throw new Error(`Failed to prepare Passport owner: ${ownerError.message}`);
  }

  const tokenHash = hashClaimToken(token);
  const claimUpdate = {
    owner_user_id: authUser.id,
    status: "claimed" as const,
    claimed_at: new Date().toISOString(),
    claim_token_hash: tokenHash,
    claim_public_token: null
  };
  let claimResult = await adminClient
    .from("unclaimed_passports")
    .update(claimUpdate)
    .eq("passport_id", passport.passportId)
    .eq("claim_token_hash", tokenHash)
    .eq("status", "unclaimed")
    .select("*")
    .maybeSingle();

  if (!claimResult.data && !claimResult.error && passport.claimToken === token) {
    claimResult = await adminClient
      .from("unclaimed_passports")
      .update(claimUpdate)
      .eq("passport_id", passport.passportId)
      .eq("claim_public_token", token)
      .eq("status", "unclaimed")
      .select("*")
      .maybeSingle();
  }

  const { data: claimedRow, error: claimError } = claimResult;

  if (claimError) {
    throw new Error(`Failed to claim Passport: ${claimError.message}`);
  }
  if (!claimedRow) {
    throw new Error("This Passport was already claimed.");
  }

  const { error: userError } = await adminClient.from("users").upsert(
    {
      user_id: authUser.id,
      email: ownerEmail,
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
