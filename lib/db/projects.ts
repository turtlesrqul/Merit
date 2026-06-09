import type { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildArtifactPreviewUrl,
  getArtifactDisplayLabel,
  type ProjectType,
  resolveProjectVisualPreview
} from "@/lib/artifacts";
import { rankProjectsForDiscovery, type FeedLabel } from "@/lib/projects/feed-ranking";
import { isModerationEnabled } from "@/lib/runtime-config";

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type ArtifactData = {
  url: string;
  type: string;
  previewUrl: string | null;
  label: string;
};

export type ProjectEngagement = {
  views: number;
  likes: number;
  saves: number;
};

export type ProjectCardData = {
  projectId: string;
  userId: string;
  title: string;
  hook: string;
  problemSolved: string;
  whatWasBuilt: string;
  category: string;
  projectType: ProjectType;
  coverImageUrl: string | null;
  isFeatured: boolean;
  impact: string | null;
  createdAt: string;
  skills: string[];
  artifacts: ArtifactData[];
  authorName: string | null;
  authorHeadline: string | null;
  engagement: ProjectEngagement;
  feedLabel: FeedLabel;
};

export type SavedInteractionState = {
  savedProjectIds: string[];
  inspiredProjectIds: string[];
};

export type ProjectFormData = {
  projectId: string;
  title: string;
  hook: string;
  problemSolved: string;
  whatWasBuilt: string;
  category: string;
  projectType: ProjectType;
  coverImageUrl: string;
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
  targetRoles: string[];
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

function safeProjectType(value: unknown): ProjectType {
  if (value === "web" || value === "design" || value === "document" || value === "other") {
    return value;
  }
  return "other";
}

function toOneLine(value: string, fallback: string) {
  const firstLine = value.split("\n")[0]?.trim();
  if (firstLine) {
    return firstLine.slice(0, 140);
  }
  return fallback.slice(0, 140);
}

const PROJECT_SELECT = `
  project_id,
  user_id,
  title,
  hook,
  problem_solved,
  what_was_built,
  category,
  project_type,
  cover_image_url,
  is_featured,
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
`;

const LEGACY_PROJECT_SELECT = `
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
`;

function isMissingColumnError(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("column projects.hook does not exist") ||
    message.includes("column projects.project_type does not exist") ||
    message.includes("column projects.cover_image_url does not exist") ||
    message.includes("column projects.is_featured does not exist")
  );
}

function isMissingTableError(errorMessage: string, tableName: string) {
  const message = errorMessage.toLowerCase();
  const bareTable = tableName.toLowerCase();
  const publicTable = `public.${bareTable}`;
  return (
    message.includes(`relation "${bareTable}" does not exist`) ||
    message.includes(`relation '${bareTable}' does not exist`) ||
    message.includes(`relation "${publicTable}" does not exist`) ||
    message.includes(`relation '${publicTable}' does not exist`) ||
    (message.includes("schema cache") &&
      (message.includes(`'${bareTable}'`) ||
        message.includes(`"${bareTable}"`) ||
        message.includes(`'${publicTable}'`) ||
        message.includes(`"${publicTable}"`)))
  );
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
        const artifactType = safeString(entry.artifact_type) || "link";
        return {
          url,
          type: artifactType,
          previewUrl: safeNullableString(entry.preview_url) ?? buildArtifactPreviewUrl(url, artifactType),
          label: getArtifactDisplayLabel(url)
        };
      })
      .filter((entry): entry is ArtifactData => Boolean(entry));

    const title = safeString(project.title);
    const problemSolved = safeString(project.problem_solved);

    return {
      projectId: safeString(project.project_id),
      userId: safeString(project.user_id),
      title,
      hook: toOneLine(safeString(project.hook), toOneLine(problemSolved, title || "Untitled project")),
      problemSolved,
      whatWasBuilt: safeString(project.what_was_built),
      category: safeString(project.category),
      projectType: safeProjectType(project.project_type),
      coverImageUrl: safeNullableString(project.cover_image_url),
      isFeatured: Boolean(project.is_featured),
      impact: safeNullableString(project.impact),
      createdAt: safeString(project.created_at),
      skills,
      artifacts: artifactItems,
      authorName: safeNullableString(users.name),
      authorHeadline: safeNullableString(users.headline),
      engagement: {
        views: 0,
        likes: 0,
        saves: 0
      },
      feedLabel: null
    };
  });
}

async function countByProject(
  supabase: DbClient,
  tableName: "saved_projects" | "inspired_projects" | "project_views",
  projectIds: string[],
  columnName: "project_id" = "project_id"
) {
  if (projectIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .in(columnName, projectIds);

  if (error) {
    if (isMissingTableError(error.message, tableName)) {
      return new Map<string, number>();
    }
    throw new Error(`Failed to read ${tableName} counts: ${error.message}`);
  }

  const counts = new Map<string, number>();
  ((data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const projectId = safeString(row[columnName]);
    if (!projectId) {
      return;
    }
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
  });
  return counts;
}

async function attachEngagement(supabase: DbClient, cards: ProjectCardData[]) {
  if (cards.length === 0) {
    return cards;
  }

  const projectIds = cards.map((card) => card.projectId);
  const [savedCounts, inspiredCounts, viewCounts] = await Promise.all([
    countByProject(supabase, "saved_projects", projectIds),
    countByProject(supabase, "inspired_projects", projectIds),
    countByProject(supabase, "project_views", projectIds)
  ]);

  return cards.map((card) => ({
    ...card,
    engagement: {
      views: viewCounts.get(card.projectId) ?? 0,
      likes: inspiredCounts.get(card.projectId) ?? 0,
      saves: savedCounts.get(card.projectId) ?? 0
    }
  }));
}

async function excludeHiddenProjects(supabase: DbClient, cards: ProjectCardData[]) {
  if (cards.length === 0 || !isModerationEnabled()) {
    return cards;
  }

  const projectIds = cards.map((card) => card.projectId);
  const { data, error } = await supabase
    .from("hidden_projects")
    .select("project_id")
    .in("project_id", projectIds);

  if (error) {
    if (isMissingTableError(error.message, "hidden_projects")) {
      return cards;
    }
    throw new Error(`Failed to fetch hidden project ids: ${error.message}`);
  }

  const hiddenProjectIds = new Set(
    ((data ?? []) as Array<Record<string, unknown>>)
      .map((row) => safeString(row.project_id))
      .filter(Boolean)
  );

  if (hiddenProjectIds.size === 0) {
    return cards;
  }
  return cards.filter((card) => !hiddenProjectIds.has(card.projectId));
}

function withResolvedFeedLabels(cards: ProjectCardData[]) {
  const ranked = rankProjectsForDiscovery(cards);
  const cardById = new Map(cards.map((card) => [card.projectId, card]));

  return ranked
    .map((rankedCard) => {
      const original = cardById.get(rankedCard.projectId);
      if (!original) {
        return null;
      }
      return {
        ...original,
        feedLabel: rankedCard.feedLabel
      };
    })
    .filter((card): card is ProjectCardData => Boolean(card));
}

async function fetchProjectRowsWithSchemaFallback(
  supabase: DbClient,
  options: {
    userId?: string;
    projectId?: string;
    projectIds?: string[];
    orderByCreatedAtDesc?: boolean;
    maybeSingle?: boolean;
  } = {}
) {
  const runSelect = async (selectClause: string) => {
    let query = supabase.from("projects").select(selectClause);

    if (options.userId) {
      query = query.eq("user_id", options.userId);
    }
    if (options.projectId) {
      query = query.eq("project_id", options.projectId);
    }
    if (options.projectIds && options.projectIds.length > 0) {
      query = query.in("project_id", options.projectIds);
    }
    if (options.orderByCreatedAtDesc) {
      query = query.order("created_at", { ascending: false });
    }
    if (options.maybeSingle) {
      return query.maybeSingle();
    }
    return query;
  };

  const preferred = await runSelect(PROJECT_SELECT);
  if (!preferred.error) {
    return preferred;
  }
  if (!isMissingColumnError(preferred.error.message)) {
    return preferred;
  }
  return runSelect(LEGACY_PROJECT_SELECT);
}

export async function fetchDiscoveryProjects(supabase: DbClient): Promise<ProjectCardData[]> {
  const { data, error } = await fetchProjectRowsWithSchemaFallback(supabase);

  if (error) {
    throw new Error(`Failed to fetch discovery projects: ${error.message}`);
  }

  const baseCards = await excludeHiddenProjects(supabase, mapProjectRows((data ?? []) as unknown[]));
  const withEngagement = await attachEngagement(supabase, baseCards);
  return withResolvedFeedLabels(withEngagement);
}

export async function fetchProjectsByUser(
  supabase: DbClient,
  userId: string
): Promise<ProjectCardData[]> {
  const { data, error } = await fetchProjectRowsWithSchemaFallback(supabase, {
    userId,
    orderByCreatedAtDesc: true
  });

  if (error) {
    throw new Error(`Failed to fetch user projects: ${error.message}`);
  }

  const cards = await excludeHiddenProjects(supabase, mapProjectRows((data ?? []) as unknown[]));
  return attachEngagement(supabase, cards);
}

export async function fetchProjectById(
  supabase: DbClient,
  projectId: string
): Promise<ProjectCardData | null> {
  const { data, error } = await fetchProjectRowsWithSchemaFallback(supabase, {
    projectId,
    maybeSingle: true
  });

  if (error) {
    throw new Error(`Failed to fetch project detail: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const filteredCards = await excludeHiddenProjects(supabase, mapProjectRows([data as unknown]));
  const [card] = await attachEngagement(supabase, filteredCards);
  if (!card) {
    return null;
  }
  return {
    ...card,
    feedLabel: card.isFeatured ? "Featured" : null
  };
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
    if (isMissingTableError(savedResult.error.message, "saved_projects")) {
      return { savedProjectIds: [], inspiredProjectIds: [] };
    }
    throw new Error(`Failed to fetch saved projects: ${savedResult.error.message}`);
  }
  if (inspiredResult.error) {
    if (isMissingTableError(inspiredResult.error.message, "inspired_projects")) {
      return { savedProjectIds: [], inspiredProjectIds: [] };
    }
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
    if (isMissingTableError(savedError.message, "saved_projects")) {
      return [];
    }
    throw new Error(`Failed to fetch saved project ids: ${savedError.message}`);
  }

  const savedProjectIds = ((savedRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => safeString(row.project_id))
    .filter(Boolean);

  if (savedProjectIds.length === 0) {
    return [];
  }

  const { data: projectRows, error: projectError } = await fetchProjectRowsWithSchemaFallback(
    supabase,
    {
      projectIds: savedProjectIds
    }
  );

  if (projectError) {
    throw new Error(`Failed to fetch saved project cards: ${projectError.message}`);
  }

  const visibleCards = await excludeHiddenProjects(supabase, mapProjectRows((projectRows ?? []) as unknown[]));
  const cards = await attachEngagement(supabase, visibleCards);
  const order = new Map(savedProjectIds.map((savedProjectId, index) => [savedProjectId, index]));
  return cards.sort(
    (a, b) => (order.get(a.projectId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.projectId) ?? Number.MAX_SAFE_INTEGER)
  );
}

export async function fetchProjectFormData(
  supabase: DbClient,
  projectId: string,
  userId: string
): Promise<ProjectFormData | null> {
  let projectResult = await supabase
    .from("projects")
    .select(
      `
      project_id,
      user_id,
      title,
      hook,
      problem_solved,
      what_was_built,
      category,
      project_type,
      cover_image_url,
      impact
    `
    )
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectResult.error && isMissingColumnError(projectResult.error.message)) {
    projectResult = await supabase
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
  }

  const project = projectResult.data;
  const projectError = projectResult.error;

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
    supabase.from("artifacts").select("artifact_url").eq("project_id", projectId)
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
  const title = safeString(row.title);
  const problemSolved = safeString(row.problem_solved);
  const hook = safeString(row.hook) || toOneLine(problemSolved, title);

  return {
    projectId: safeString(row.project_id),
    title,
    hook,
    problemSolved,
    whatWasBuilt: safeString(row.what_was_built),
    category: safeString(row.category),
    projectType: safeProjectType(row.project_type),
    coverImageUrl: safeString(row.cover_image_url),
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
      .select("user_id, name, headline, role_type, target_roles")
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
    targetRoles: safeStringArray(user.target_roles),
    portfolioLinks: safeStringArray(profile.portfolio_links),
    projects
  };
}

export async function recordProjectView(
  supabase: DbClient,
  viewerUserId: string,
  projectId: string
) {
  const { error } = await supabase.from("project_views").upsert(
    {
      project_id: projectId,
      viewer_user_id: viewerUserId
    },
    {
      onConflict: "project_id,viewer_user_id",
      ignoreDuplicates: true
    }
  );

  if (error) {
    if (isMissingTableError(error.message, "project_views")) {
      return;
    }
    throw new Error(`Failed to record project view: ${error.message}`);
  }
}

export async function fetchProjectVisual(
  supabase: DbClient,
  projectId: string
): Promise<ReturnType<typeof resolveProjectVisualPreview> | null> {
  const card = await fetchProjectById(supabase, projectId);
  if (!card) {
    return null;
  }
  return resolveProjectVisualPreview({
    projectType: card.projectType,
    artifacts: card.artifacts,
    coverImageUrl: card.coverImageUrl
  });
}
