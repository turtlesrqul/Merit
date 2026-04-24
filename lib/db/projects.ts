import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildArtifactPreviewUrl, getArtifactDisplayLabel } from "@/lib/artifacts";

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type ArtifactData = {
  url: string;
  type: string;
  previewUrl: string | null;
  label: string;
};

export type ProjectCardData = {
  projectId: string;
  userId: string;
  title: string;
  problemSolved: string;
  whatWasBuilt: string;
  category: string;
  impact: string | null;
  createdAt: string;
  skills: string[];
  artifacts: ArtifactData[];
  authorName: string | null;
  authorHeadline: string | null;
};

export type SavedInteractionState = {
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

export type ProjectFormData = {
  projectId: string;
  title: string;
  problemSolved: string;
  whatWasBuilt: string;
  category: string;
  impact: string;
  skills: string[];
  artifactLinks: string[];
};

export type PublicCandidateData = {
  userId: string;
  name: string | null;
  headline: string | null;
  roleType: "candidate" | "recruiter" | null;
  bio: string | null;
  contactEmail: string | null;
  portfolioLinks: string[];
  projects: ProjectCardData[];
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function safeRoleType(value: unknown): "candidate" | "recruiter" | null {
  return value === "candidate" || value === "recruiter" ? value : null;
}

function mapProjectRows(rows: unknown[]): ProjectCardData[] {
  return rows.map((row) => {
    const project = row as Record<string, unknown>;
    const users = (project.users ?? {}) as Record<string, unknown>;

    const projectSkills = Array.isArray(project.project_skills)
      ? (project.project_skills as Array<Record<string, unknown>>)
      : [];
    const artifacts = Array.isArray(project.artifacts)
      ? (project.artifacts as Array<Record<string, unknown>>)
      : [];

    const skills = projectSkills
      .map((entry) => {
        const skillTag = (entry.skill_tags ?? {}) as Record<string, unknown>;
        return safeString(skillTag.skill_name);
      })
      .filter(Boolean);

    const artifactItems = artifacts
      .map((entry) => {
        const url = safeString(entry.artifact_url);
        if (!url) {
          return null;
        }
        return {
          url,
          type: safeString(entry.artifact_type) || "link",
          previewUrl:
            safeNullableString(entry.preview_url) ??
            buildArtifactPreviewUrl(url, safeString(entry.artifact_type) || "link"),
          label: getArtifactDisplayLabel(url)
        };
      })
      .filter((entry): entry is ArtifactData => Boolean(entry));

    return {
      projectId: safeString(project.project_id),
      userId: safeString(project.user_id),
      title: safeString(project.title),
      problemSolved: safeString(project.problem_solved),
      whatWasBuilt: safeString(project.what_was_built),
      category: safeString(project.category),
      impact: safeNullableString(project.impact),
      createdAt: safeString(project.created_at),
      skills,
      artifacts: artifactItems,
      authorName: safeNullableString(users.name),
      authorHeadline: safeNullableString(users.headline)
    };
  });
}

export async function fetchDiscoveryProjects(supabase: DbClient): Promise<ProjectCardData[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      user_id,
      title,
      problem_solved,
      what_was_built,
      category,
      impact,
      created_at,
      users:users!projects_user_id_fkey (
        name,
        headline
      ),
      project_skills (
        skill_tags (
          skill_name
        )
      ),
      artifacts (
        artifact_url,
        artifact_type,
        preview_url
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch discovery projects: ${error.message}`);
  }

  return mapProjectRows((data ?? []) as unknown[]);
}

export async function fetchProjectsByUser(
  supabase: DbClient,
  userId: string
): Promise<ProjectCardData[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      user_id,
      title,
      problem_solved,
      what_was_built,
      category,
      impact,
      created_at,
      users:users!projects_user_id_fkey (
        name,
        headline
      ),
      project_skills (
        skill_tags (
          skill_name
        )
      ),
      artifacts (
        artifact_url,
        artifact_type,
        preview_url
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user projects: ${error.message}`);
  }

  return mapProjectRows((data ?? []) as unknown[]);
}

export async function fetchSavedInteractionState(
  supabase: DbClient,
  userId: string
): Promise<SavedInteractionState> {
  const [savedResult, inspiredResult] = await Promise.all([
    supabase.from("saved_projects").select("project_id").eq("user_id", userId),
    supabase.from("inspired_projects").select("project_id").eq("user_id", userId)
  ]);

  if (savedResult.error) {
    throw new Error(`Failed to fetch saved projects: ${savedResult.error.message}`);
  }
  if (inspiredResult.error) {
    throw new Error(`Failed to fetch inspired projects: ${inspiredResult.error.message}`);
  }

  const savedProjectIds = ((savedResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => safeString(row.project_id))
    .filter(Boolean);
  const inspiredProjectIds = ((inspiredResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => safeString(row.project_id))
    .filter(Boolean);

  return { savedProjectIds, inspiredProjectIds };
}

export async function fetchSavedProjectsByUser(
  supabase: DbClient,
  userId: string
): Promise<ProjectCardData[]> {
  const { data: savedRows, error: savedError } = await supabase
    .from("saved_projects")
    .select("project_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedError) {
    throw new Error(`Failed to fetch saved project ids: ${savedError.message}`);
  }

  const savedProjectIds = ((savedRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => safeString(row.project_id))
    .filter(Boolean);

  if (savedProjectIds.length === 0) {
    return [];
  }

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      user_id,
      title,
      problem_solved,
      what_was_built,
      category,
      impact,
      created_at,
      users:users!projects_user_id_fkey (
        name,
        headline
      ),
      project_skills (
        skill_tags (
          skill_name
        )
      ),
      artifacts (
        artifact_url,
        artifact_type,
        preview_url
      )
    `
    )
    .in("project_id", savedProjectIds);

  if (projectError) {
    throw new Error(`Failed to fetch saved project cards: ${projectError.message}`);
  }

  const cards = mapProjectRows((projectRows ?? []) as unknown[]);
  const order = new Map(savedProjectIds.map((projectId, index) => [projectId, index]));
  return cards.sort(
    (a, b) => (order.get(a.projectId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.projectId) ?? Number.MAX_SAFE_INTEGER)
  );
}

export async function fetchProjectFormData(
  supabase: DbClient,
  projectId: string,
  userId: string
): Promise<ProjectFormData | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      user_id,
      title,
      problem_solved,
      what_was_built,
      category,
      impact
    `
    )
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to fetch project for edit: ${projectError.message}`);
  }
  if (!project) {
    return null;
  }

  const [skillsResult, artifactsResult] = await Promise.all([
    supabase
      .from("project_skills")
      .select(
        `
      skill_tags (
        skill_name
      )
    `
      )
      .eq("project_id", projectId),
    supabase
      .from("artifacts")
      .select("artifact_url, artifact_type, preview_url")
      .eq("project_id", projectId)
  ]);

  if (skillsResult.error) {
    throw new Error(`Failed to fetch project skills: ${skillsResult.error.message}`);
  }
  if (artifactsResult.error) {
    throw new Error(`Failed to fetch project artifacts: ${artifactsResult.error.message}`);
  }

  const skills = ((skillsResult.data ?? []) as Array<Record<string, unknown>>)
    .map((entry) => {
      const skillTag = (entry.skill_tags ?? {}) as Record<string, unknown>;
      return safeString(skillTag.skill_name);
    })
    .filter(Boolean);

  const artifactLinks = ((artifactsResult.data ?? []) as Array<Record<string, unknown>>)
    .map((entry) => safeString(entry.artifact_url))
    .filter(Boolean);

  const row = project as Record<string, unknown>;

  return {
    projectId: safeString(row.project_id),
    title: safeString(row.title),
    problemSolved: safeString(row.problem_solved),
    whatWasBuilt: safeString(row.what_was_built),
    category: safeString(row.category),
    impact: safeString(row.impact),
    skills,
    artifactLinks
  };
}

export async function fetchPublicCandidateData(
  supabase: DbClient,
  userId: string
): Promise<PublicCandidateData | null> {
  const [userResult, profileResult, projects] = await Promise.all([
    supabase
      .from("users")
      .select("user_id, name, headline, role_type")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("candidate_profiles")
      .select("bio, contact_email, portfolio_links")
      .eq("user_id", userId)
      .maybeSingle(),
    fetchProjectsByUser(supabase, userId)
  ]);

  if (userResult.error) {
    throw new Error(`Failed to fetch public user: ${userResult.error.message}`);
  }
  if (profileResult.error) {
    throw new Error(`Failed to fetch public profile: ${profileResult.error.message}`);
  }
  if (!userResult.data) {
    return null;
  }

  const user = userResult.data as Record<string, unknown>;
  const profile = (profileResult.data ?? {}) as Record<string, unknown>;

  return {
    userId: safeString(user.user_id),
    name: safeNullableString(user.name),
    headline: safeNullableString(user.headline),
    roleType: safeRoleType(user.role_type),
    bio: safeNullableString(profile.bio),
    contactEmail: safeNullableString(profile.contact_email),
    portfolioLinks: safeStringArray(profile.portfolio_links),
    projects
  };
}
