import type { User } from "@supabase/supabase-js";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateProfileCompletionScore } from "@/lib/profile/completion-score";
import type { Database } from "@/lib/supabase/types";

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

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

function deriveName(authUser: User): string {
  const metadataName = authUser.user_metadata.name ?? authUser.user_metadata.full_name;
  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }

  if (typeof authUser.email === "string" && authUser.email.includes("@")) {
    return authUser.email.split("@")[0];
  }

  return "Merit User";
}

export async function ensureUserAndProfile(supabase: DbClient, authUser: User) {
  const [existingUserResult, existingProfileResult] = await Promise.all([
    supabase
      .from("users")
      .select("user_id, role_type, headline, target_roles, name, email")
      .eq("user_id", authUser.id)
      .maybeSingle(),
    supabase
      .from("candidate_profiles")
      .select("user_id, bio, contact_email, portfolio_links")
      .eq("user_id", authUser.id)
      .maybeSingle()
  ]);

  if (existingUserResult.error) {
    throw new Error(`Failed to read existing users row: ${existingUserResult.error.message}`);
  }
  if (existingProfileResult.error) {
    throw new Error(`Failed to load candidate profile: ${existingProfileResult.error.message}`);
  }

  const existingUser = existingUserResult.data as Record<string, unknown> | null;
  const existingProfile = existingProfileResult.data as Record<string, unknown> | null;

  // Most requests are for existing users; skip writes to reduce page latency.
  if (existingUser && existingProfile) {
    return;
  }

  const normalizedName = safeString(existingUser?.name) || deriveName(authUser);
  const normalizedHeadline = safeNullableString(existingUser?.headline);
  const normalizedTargetRoles = safeStringArray(existingUser?.target_roles);
  const normalizedEmail =
    safeString(existingUser?.email) || authUser.email || `${authUser.id}@placeholder.local`;

  const userPayload: Database["public"]["Tables"]["users"]["Insert"] = {
    user_id: authUser.id,
    email: normalizedEmail,
    name: normalizedName,
    headline: normalizedHeadline,
    role_type: safeRoleType(existingUser?.role_type) ?? "candidate",
    target_roles: normalizedTargetRoles
  };

  const profilePayload: Database["public"]["Tables"]["candidate_profiles"]["Insert"] = {
    user_id: authUser.id,
    contact_email: safeNullableString(existingProfile?.contact_email) ?? authUser.email ?? null,
    portfolio_links: safeStringArray(existingProfile?.portfolio_links),
    bio: safeNullableString(existingProfile?.bio)
  };

  const score = calculateProfileCompletionScore({
    name: normalizedName,
    headline: normalizedHeadline,
    bio: profilePayload.bio,
    contactEmail: profilePayload.contact_email,
    portfolioLinks: profilePayload.portfolio_links ?? [],
    targetRoles: normalizedTargetRoles
  });

  if (!existingUser) {
    const { error: userError } = await supabase
      .from("users")
      .upsert(userPayload, { onConflict: "user_id" });
    if (userError) {
      throw new Error(`Failed to initialize users row: ${userError.message}`);
    }
  }

  if (!existingProfile) {
    const { error: profileError } = await supabase.from("candidate_profiles").upsert(
      {
        ...profilePayload,
        profile_completion_score: score
      },
      { onConflict: "user_id" }
    );
    if (profileError) {
      throw new Error(`Failed to initialize profile row: ${profileError.message}`);
    }
  }
}

export type ViewerProfile = {
  userId: string;
  email: string;
  name: string | null;
  headline: string | null;
  roleType: "candidate" | "recruiter" | null;
  targetRoles: string[];
  bio: string | null;
  contactEmail: string | null;
  portfolioLinks: string[];
  profileCompletionScore: number;
};

export type DirectoryProjectPreview = {
  title: string;
  category: string;
};

export type DirectoryMember = {
  userId: string;
  name: string | null;
  headline: string | null;
  roleType: "candidate" | "recruiter" | null;
  bio: string | null;
  contactEmail: string | null;
  projectCount: number;
  topSkills: string[];
  recentProjects: DirectoryProjectPreview[];
};

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export async function getViewerProfile(
  supabase: DbClient,
  userId: string
): Promise<ViewerProfile | null> {
  const [userResult, profileResult] = await Promise.all([
    supabase.from("users").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle()
  ]);

  if (userResult.error) {
    throw new Error(`Failed to fetch users row: ${userResult.error.message}`);
  }
  if (profileResult.error) {
    throw new Error(`Failed to fetch candidate profile: ${profileResult.error.message}`);
  }
  if (!userResult.data || !profileResult.data) {
    return null;
  }

  const user = userResult.data as Record<string, unknown>;
  const profile = profileResult.data as Record<string, unknown>;

  return {
    userId: safeString(user.user_id),
    email: safeString(user.email),
    name: safeNullableString(user.name),
    headline: safeNullableString(user.headline),
    roleType: safeRoleType(user.role_type),
    targetRoles: safeStringArray(user.target_roles),
    bio: safeNullableString(profile.bio),
    contactEmail: safeNullableString(profile.contact_email),
    portfolioLinks: safeStringArray(profile.portfolio_links),
    profileCompletionScore:
      typeof profile.profile_completion_score === "number" ? profile.profile_completion_score : 0
  };
}

export async function fetchDirectoryMembers(supabase: DbClient): Promise<DirectoryMember[]> {
  const [usersResult, profilesResult, projectsResult] = await Promise.all([
    supabase.from("users").select("user_id, name, headline, role_type"),
    supabase.from("candidate_profiles").select("user_id, bio, contact_email"),
    supabase
      .from("projects")
      .select(
        `
      project_id,
      user_id,
      title,
      category,
      created_at,
      project_skills (
        skill_tags (
          skill_name
        )
      )
    `
      )
      .order("created_at", { ascending: false })
  ]);

  if (usersResult.error) {
    throw new Error(`Failed to fetch directory users: ${usersResult.error.message}`);
  }
  if (profilesResult.error) {
    throw new Error(`Failed to fetch directory profiles: ${profilesResult.error.message}`);
  }
  if (projectsResult.error) {
    throw new Error(`Failed to fetch directory projects: ${projectsResult.error.message}`);
  }

  const profileByUserId = new Map<
    string,
    {
      bio: string | null;
      contactEmail: string | null;
    }
  >();

  ((profilesResult.data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const key = safeString(row.user_id);
    if (!key) {
      return;
    }
    profileByUserId.set(key, {
      bio: safeNullableString(row.bio),
      contactEmail: safeNullableString(row.contact_email)
    });
  });

  const projectStateByUser = new Map<
    string,
    {
      projectCount: number;
      recentProjects: DirectoryProjectPreview[];
      allSkills: string[];
    }
  >();

  ((projectsResult.data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const userId = safeString(row.user_id);
    if (!userId) {
      return;
    }

    const current = projectStateByUser.get(userId) ?? {
      projectCount: 0,
      recentProjects: [],
      allSkills: []
    };
    current.projectCount += 1;

    if (current.recentProjects.length < 3) {
      current.recentProjects.push({
        title: safeString(row.title),
        category: safeString(row.category)
      });
    }

    const projectSkills = Array.isArray(row.project_skills)
      ? (row.project_skills as Array<Record<string, unknown>>)
      : [];
    projectSkills.forEach((entry) => {
      const skillTag = (entry.skill_tags ?? {}) as Record<string, unknown>;
      const skill = safeString(skillTag.skill_name);
      if (skill) {
        current.allSkills.push(normalizeSkill(skill));
      }
    });

    projectStateByUser.set(userId, current);
  });

  return ((usersResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const userId = safeString(row.user_id);
      const profile = profileByUserId.get(userId);
      const projectState = projectStateByUser.get(userId) ?? {
        projectCount: 0,
        recentProjects: [],
        allSkills: []
      };

      const topSkills = Array.from(new Set(projectState.allSkills)).slice(0, 8);

      return {
        userId,
        name: safeNullableString(row.name),
        headline: safeNullableString(row.headline),
        roleType: safeRoleType(row.role_type),
        bio: profile?.bio ?? null,
        contactEmail: profile?.contactEmail ?? null,
        projectCount: projectState.projectCount,
        topSkills,
        recentProjects: projectState.recentProjects
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount);
}
