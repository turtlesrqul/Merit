import type { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizeSkills,
  rankCandidatesForOpportunity,
  type CandidateEvidence,
  type MatchResult
} from "@/lib/matching/engine";

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type OpportunityRecord = {
  opportunityId: string;
  recruiterId: string;
  recruiterName: string | null;
  title: string;
  company: string;
  description: string;
  skillsSought: string[];
  createdAt: string;
  matchScore: number | null;
  matchRationale: string[];
};

export type RecruiterOpportunity = {
  opportunityId: string;
  title: string;
  company: string;
  description: string;
  skillsSought: string[];
  createdAt: string;
  matchCount: number;
};

export type PublicRecruiterOpportunity = {
  opportunityId: string;
  title: string;
  company: string;
  description: string;
  skillsSought: string[];
  createdAt: string;
};

export type CandidateDirectoryItem = {
  userId: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  contactEmail: string | null;
  projectCount: number;
  topSkills: string[];
};

export type RecruiterMatchedCandidate = {
  opportunityId: string;
  userId: string;
  name: string | null;
  headline: string | null;
  contactEmail: string | null;
  matchScore: number;
  rationale: string[];
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

function safeNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function aggregateCandidateEvidence(
  userIds: string[],
  projectRows: Array<Record<string, unknown>>
): CandidateEvidence[] {
  const base: Record<string, CandidateEvidence> = {};
  userIds.forEach((userId) => {
    base[userId] = {
      candidateUserId: userId,
      skills: [],
      projectCount: 0,
      projectsWithImpact: 0,
      projectsWithArtifacts: 0
    };
  });

  for (const row of projectRows) {
    const userId = safeString(row.user_id);
    if (!userId || !base[userId]) {
      continue;
    }

    const projectSkills = Array.isArray(row.project_skills)
      ? (row.project_skills as Array<Record<string, unknown>>)
      : [];
    const artifacts = Array.isArray(row.artifacts)
      ? (row.artifacts as Array<Record<string, unknown>>)
      : [];

    const current = base[userId];
    current.projectCount += 1;
    if (safeString(row.impact).trim().length > 0) {
      current.projectsWithImpact += 1;
    }
    if (artifacts.length > 0) {
      current.projectsWithArtifacts += 1;
    }

    projectSkills.forEach((entry) => {
      const skillTag = (entry.skill_tags ?? {}) as Record<string, unknown>;
      const skill = safeString(skillTag.skill_name);
      if (skill) {
        current.skills.push(skill);
      }
    });
  }

  return Object.values(base).map((evidence) => ({
    ...evidence,
    skills: normalizeSkills(evidence.skills)
  }));
}

export async function fetchCandidateEvidenceForMatching(
  supabase: DbClient,
  recruiterId: string
): Promise<CandidateEvidence[]> {
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("user_id, role_type")
    .neq("user_id", recruiterId);

  if (usersError) {
    throw new Error(`Failed to fetch candidates for matching: ${usersError.message}`);
  }

  const userIds = ((users ?? []) as Array<Record<string, unknown>>)
    .filter((user) => safeString(user.role_type) !== "recruiter")
    .map((user) => safeString(user.user_id))
    .filter(Boolean);

  if (userIds.length === 0) {
    return [];
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(
      `
      user_id,
      impact,
      project_skills (
        skill_tags (
          skill_name
        )
      ),
      artifacts (
        artifact_id
      )
    `
    )
    .in("user_id", userIds);

  if (projectsError) {
    throw new Error(`Failed to fetch project evidence for matching: ${projectsError.message}`);
  }

  return aggregateCandidateEvidence(userIds, (projects ?? []) as Array<Record<string, unknown>>);
}

export async function upsertMatchesForOpportunity(
  supabase: DbClient,
  recruiterId: string,
  opportunityId: string
): Promise<MatchResult[]> {
  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("opportunity_id, recruiter_id, skills_sought")
    .eq("opportunity_id", opportunityId)
    .eq("recruiter_id", recruiterId)
    .maybeSingle();

  if (opportunityError) {
    throw new Error(`Failed to fetch opportunity for matching: ${opportunityError.message}`);
  }
  if (!opportunity) {
    throw new Error("Opportunity not found for current recruiter.");
  }

  const evidence = await fetchCandidateEvidenceForMatching(supabase, recruiterId);
  const rankedMatches = rankCandidatesForOpportunity(
    safeStringArray((opportunity as Record<string, unknown>).skills_sought),
    evidence
  );

  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("opportunity_id", opportunityId);
  if (deleteError) {
    throw new Error(`Failed to clear old matches: ${deleteError.message}`);
  }

  if (rankedMatches.length > 0) {
    const withRationalePayload = rankedMatches.map((match) => ({
      user_id: match.candidateUserId,
      opportunity_id: opportunityId,
      match_score: match.score,
      match_rationale: match.reasons
    }));
    const { error: insertError } = await supabase.from("matches").insert(withRationalePayload);

    if (insertError) {
      if (insertError.message.toLowerCase().includes("match_rationale")) {
        const { error: legacyInsertError } = await supabase.from("matches").insert(
          rankedMatches.map((match) => ({
            user_id: match.candidateUserId,
            opportunity_id: opportunityId,
            match_score: match.score
          }))
        );
        if (legacyInsertError) {
          throw new Error(`Failed to save matches: ${legacyInsertError.message}`);
        }
      } else {
        throw new Error(`Failed to save matches: ${insertError.message}`);
      }
    }
  }

  return rankedMatches;
}

export async function upsertMatchesForRecruiter(
  supabase: DbClient,
  recruiterId: string
): Promise<{ opportunityId: string; matches: MatchResult[] }[]> {
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("opportunity_id")
    .eq("recruiter_id", recruiterId);

  if (error) {
    throw new Error(`Failed to fetch recruiter opportunities for matching: ${error.message}`);
  }

  const results: { opportunityId: string; matches: MatchResult[] }[] = [];
  for (const row of (opportunities ?? []) as Array<Record<string, unknown>>) {
    const opportunityId = safeString(row.opportunity_id);
    if (!opportunityId) {
      continue;
    }
    const matches = await upsertMatchesForOpportunity(supabase, recruiterId, opportunityId);
    results.push({ opportunityId, matches });
  }
  return results;
}

export async function fetchOpportunitiesForCandidate(
  supabase: DbClient,
  userId: string
): Promise<OpportunityRecord[]> {
  const opportunitiesResult = await supabase
    .from("opportunities")
    .select(
      `
      opportunity_id,
      recruiter_id,
      title,
      company,
      description,
      skills_sought,
      created_at,
      recruiter:users!opportunities_recruiter_id_fkey (
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (opportunitiesResult.error) {
    throw new Error(`Failed to load opportunities: ${opportunitiesResult.error.message}`);
  }

  const matchesWithRationaleResult = await supabase
    .from("matches")
    .select("opportunity_id, match_score, match_rationale")
    .eq("user_id", userId);

  let matchRows: Array<Record<string, unknown>> = [];
  if (matchesWithRationaleResult.error) {
    if (matchesWithRationaleResult.error.message.toLowerCase().includes("match_rationale")) {
      const fallbackResult = await supabase
        .from("matches")
        .select("opportunity_id, match_score")
        .eq("user_id", userId);
      if (fallbackResult.error) {
        throw new Error(`Failed to load candidate matches: ${fallbackResult.error.message}`);
      }
      matchRows = (fallbackResult.data ?? []) as Array<Record<string, unknown>>;
    } else {
      throw new Error(`Failed to load candidate matches: ${matchesWithRationaleResult.error.message}`);
    }
  } else {
    matchRows = (matchesWithRationaleResult.data ?? []) as Array<Record<string, unknown>>;
  }

  const matchByOpportunity = new Map<string, { score: number; rationale: string[] }>();
  matchRows.forEach((row) => {
    const opportunityId = safeString(row.opportunity_id);
    if (!opportunityId) {
      return;
    }
    matchByOpportunity.set(opportunityId, {
      score: safeNumber(row.match_score),
      rationale: safeStringArray(row.match_rationale)
    });
  });

  return ((opportunitiesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const recruiter = (row.recruiter ?? {}) as Record<string, unknown>;
    const match = matchByOpportunity.get(safeString(row.opportunity_id));

    return {
      opportunityId: safeString(row.opportunity_id),
      recruiterId: safeString(row.recruiter_id),
      recruiterName: safeNullableString(recruiter.name),
      title: safeString(row.title),
      company: safeString(row.company),
      description: safeString(row.description),
      skillsSought: safeStringArray(row.skills_sought),
      createdAt: safeString(row.created_at),
      matchScore: match?.score ?? null,
      matchRationale: match?.rationale ?? []
    };
  });
}

export async function fetchRecruiterOpportunities(
  supabase: DbClient,
  recruiterId: string
): Promise<RecruiterOpportunity[]> {
  const opportunitiesResult = await supabase
    .from("opportunities")
    .select("opportunity_id, title, company, description, skills_sought, created_at")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });

  if (opportunitiesResult.error) {
    throw new Error(`Failed to fetch recruiter opportunities: ${opportunitiesResult.error.message}`);
  }

  const opportunities = (opportunitiesResult.data ?? []) as Array<Record<string, unknown>>;
  const opportunityIds = opportunities
    .map((row) => safeString(row.opportunity_id))
    .filter(Boolean);

  let matchCountsByOpportunity = new Map<string, number>();

  if (opportunityIds.length > 0) {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("opportunity_id")
      .in("opportunity_id", opportunityIds);

    if (matchesError) {
      throw new Error(`Failed to fetch recruiter match counts: ${matchesError.message}`);
    }

    matchCountsByOpportunity = ((matches ?? []) as Array<Record<string, unknown>>).reduce(
      (acc, row) => {
        const opportunityId = safeString(row.opportunity_id);
        if (!opportunityId) {
          return acc;
        }
        acc.set(opportunityId, (acc.get(opportunityId) ?? 0) + 1);
        return acc;
      },
      new Map<string, number>()
    );
  }

  return opportunities.map((row) => {
    const opportunityId = safeString(row.opportunity_id);
    return {
      opportunityId,
      title: safeString(row.title),
      company: safeString(row.company),
      description: safeString(row.description),
      skillsSought: safeStringArray(row.skills_sought),
      createdAt: safeString(row.created_at),
      matchCount: matchCountsByOpportunity.get(opportunityId) ?? 0
    };
  });
}

export async function fetchPublicRecruiterOpportunities(
  supabase: DbClient,
  recruiterId: string
): Promise<PublicRecruiterOpportunity[]> {
  const opportunitiesResult = await supabase
    .from("opportunities")
    .select("opportunity_id, title, company, description, skills_sought, created_at")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });

  if (opportunitiesResult.error) {
    throw new Error(
      `Failed to fetch public recruiter opportunities: ${opportunitiesResult.error.message}`
    );
  }

  return ((opportunitiesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    opportunityId: safeString(row.opportunity_id),
    title: safeString(row.title),
    company: safeString(row.company),
    description: safeString(row.description),
    skillsSought: safeStringArray(row.skills_sought),
    createdAt: safeString(row.created_at)
  }));
}

export async function fetchRecruiterMatchedCandidates(
  supabase: DbClient,
  recruiterId: string
): Promise<RecruiterMatchedCandidate[]> {
  const opportunitiesResult = await supabase
    .from("opportunities")
    .select("opportunity_id")
    .eq("recruiter_id", recruiterId);

  if (opportunitiesResult.error) {
    throw new Error(
      `Failed to fetch recruiter opportunities for matched candidates: ${opportunitiesResult.error.message}`
    );
  }

  const opportunityIds = ((opportunitiesResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => safeString(row.opportunity_id))
    .filter(Boolean);

  if (opportunityIds.length === 0) {
    return [];
  }

  const matchesResultWithRationale = await supabase
    .from("matches")
    .select("user_id, opportunity_id, match_score, match_rationale")
    .in("opportunity_id", opportunityIds);

  let matchRows: Array<Record<string, unknown>> = [];
  if (matchesResultWithRationale.error) {
    if (matchesResultWithRationale.error.message.toLowerCase().includes("match_rationale")) {
      const fallbackResult = await supabase
        .from("matches")
        .select("user_id, opportunity_id, match_score")
        .in("opportunity_id", opportunityIds);

      if (fallbackResult.error) {
        throw new Error(`Failed to fetch matched candidates: ${fallbackResult.error.message}`);
      }
      matchRows = (fallbackResult.data ?? []) as Array<Record<string, unknown>>;
    } else {
      throw new Error(`Failed to fetch matched candidates: ${matchesResultWithRationale.error.message}`);
    }
  } else {
    matchRows = (matchesResultWithRationale.data ?? []) as Array<Record<string, unknown>>;
  }
  const userIds = Array.from(
    new Set(matchRows.map((row) => safeString(row.user_id)).filter(Boolean))
  );

  if (userIds.length === 0) {
    return [];
  }

  const [usersResult, profilesResult] = await Promise.all([
    supabase.from("users").select("user_id, name, headline").in("user_id", userIds),
    supabase
      .from("candidate_profiles")
      .select("user_id, contact_email")
      .in("user_id", userIds)
  ]);

  if (usersResult.error) {
    throw new Error(`Failed to fetch matched candidate users: ${usersResult.error.message}`);
  }
  if (profilesResult.error) {
    throw new Error(`Failed to fetch matched candidate profiles: ${profilesResult.error.message}`);
  }

  const userMap = new Map<
    string,
    {
      name: string | null;
      headline: string | null;
    }
  >();

  ((usersResult.data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    userMap.set(safeString(row.user_id), {
      name: safeNullableString(row.name),
      headline: safeNullableString(row.headline)
    });
  });

  const profileMap = new Map<string, string | null>();
  ((profilesResult.data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    profileMap.set(safeString(row.user_id), safeNullableString(row.contact_email));
  });

  return matchRows
    .map((row) => {
      const userId = safeString(row.user_id);
      const user = userMap.get(userId);
      return {
        opportunityId: safeString(row.opportunity_id),
        userId,
        name: user?.name ?? null,
        headline: user?.headline ?? null,
        contactEmail: profileMap.get(userId) ?? null,
        matchScore: safeNumber(row.match_score),
        rationale: safeStringArray(row.match_rationale)
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function fetchCandidateDirectory(
  supabase: DbClient,
  recruiterId: string
): Promise<CandidateDirectoryItem[]> {
  const [usersResult, profilesResult, projectsResult] = await Promise.all([
    supabase
      .from("users")
      .select("user_id, name, headline, role_type")
      .neq("user_id", recruiterId),
    supabase
      .from("candidate_profiles")
      .select("user_id, bio, contact_email")
      .neq("user_id", recruiterId),
    supabase
      .from("projects")
      .select(
        `
      project_id,
      user_id,
      project_skills (
        skill_tags (
          skill_name
        )
      )
    `
      )
      .neq("user_id", recruiterId)
  ]);

  if (usersResult.error) {
    throw new Error(`Failed to fetch candidates: ${usersResult.error.message}`);
  }
  if (profilesResult.error) {
    throw new Error(`Failed to fetch candidate profiles: ${profilesResult.error.message}`);
  }
  if (projectsResult.error) {
    throw new Error(`Failed to fetch candidate projects: ${projectsResult.error.message}`);
  }

  const profileByUser = new Map<
    string,
    {
      bio: string | null;
      contactEmail: string | null;
    }
  >();

  ((profilesResult.data ?? []) as Array<Record<string, unknown>>).forEach((profile) => {
    const userId = safeString(profile.user_id);
    if (!userId) {
      return;
    }
    profileByUser.set(userId, {
      bio: safeNullableString(profile.bio),
      contactEmail: safeNullableString(profile.contact_email)
    });
  });

  const projectMetricsByUser = new Map<string, { count: number; skills: string[] }>();
  ((projectsResult.data ?? []) as Array<Record<string, unknown>>).forEach((project) => {
    const userId = safeString(project.user_id);
    if (!userId) {
      return;
    }

    const current = projectMetricsByUser.get(userId) ?? { count: 0, skills: [] };
    current.count += 1;

    const projectSkills = Array.isArray(project.project_skills)
      ? (project.project_skills as Array<Record<string, unknown>>)
      : [];

    projectSkills.forEach((entry) => {
      const skillTag = (entry.skill_tags ?? {}) as Record<string, unknown>;
      const skill = safeString(skillTag.skill_name);
      if (skill) {
        current.skills.push(skill);
      }
    });

    projectMetricsByUser.set(userId, current);
  });

  return ((usersResult.data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => safeString(row.role_type) !== "recruiter")
    .map((row) => {
      const userId = safeString(row.user_id);
      const profile = profileByUser.get(userId);
      const metric = projectMetricsByUser.get(userId) ?? { count: 0, skills: [] };

      const topSkills = normalizeSkills(metric.skills).slice(0, 6);

      return {
        userId,
        name: safeNullableString(row.name),
        headline: safeNullableString(row.headline),
        bio: profile?.bio ?? null,
        contactEmail: profile?.contactEmail ?? null,
        projectCount: metric.count,
        topSkills
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount);
}
