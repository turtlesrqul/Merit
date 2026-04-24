/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const projectRoot = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function getEnv() {
  const localEnv = parseEnvFile(path.join(projectRoot, ".env.local"));
  return {
    ...localEnv,
    ...process.env
  };
}

function normalizeSkill(skill) {
  return String(skill || "").trim().toLowerCase();
}

function normalizeSkills(values) {
  return Array.from(new Set((values || []).map(normalizeSkill).filter(Boolean)));
}

function normalizeArtifactType(type, url) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized) {
    return normalized;
  }
  const value = String(url || "").toLowerCase();
  if (value.includes("github.com")) return "github";
  if (value.includes("figma.com")) return "figma";
  if (value.includes("youtube.com") || value.includes("youtu.be") || value.includes(".mp4")) return "video";
  return "website";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateMatchScore(opportunitySkillsRaw, candidateEvidence) {
  const opportunitySkills = normalizeSkills(opportunitySkillsRaw);
  const candidateSkills = normalizeSkills(candidateEvidence.skills);

  const overlap = opportunitySkills.filter((skill) => candidateSkills.includes(skill));
  const overlapRatio = opportunitySkills.length > 0 ? overlap.length / opportunitySkills.length : 0;

  const overlapScore = overlapRatio * 65;
  const projectDepthScore = clamp(candidateEvidence.projectCount / 4, 0, 1) * 15;
  const impactScore = candidateEvidence.projectCount
    ? (candidateEvidence.projectsWithImpact / candidateEvidence.projectCount) * 10
    : 0;
  const evidenceScore = candidateEvidence.projectCount
    ? (candidateEvidence.projectsWithArtifacts / candidateEvidence.projectCount) * 10
    : 0;

  const rawScore = overlapScore + projectDepthScore + impactScore + evidenceScore;
  const score = Math.round(clamp(rawScore, 0, 100));

  const reasons = [];
  if (overlap.length > 0) {
    reasons.push(`Overlap skills: ${overlap.slice(0, 4).join(", ")}`);
  }
  if (candidateEvidence.projectCount > 0) {
    reasons.push(
      `${candidateEvidence.projectCount} project${candidateEvidence.projectCount === 1 ? "" : "s"} published`
    );
  }
  if (candidateEvidence.projectsWithImpact > 0) {
    reasons.push(
      `${candidateEvidence.projectsWithImpact} project${candidateEvidence.projectsWithImpact === 1 ? "" : "s"} with impact evidence`
    );
  }

  return {
    score,
    reasons
  };
}

async function fetchAllAuthUsers(adminClient) {
  let page = 1;
  const perPage = 200;
  const users = [];

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return users;
}

async function getOrCreateAuthUser(adminClient, account, authUsersByEmail) {
  const key = account.email.toLowerCase();
  const existing = authUsersByEmail.get(key);

  if (existing) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: { name: account.name }
    });
    if (updateError) {
      throw new Error(`Failed to update existing auth user ${account.email}: ${updateError.message}`);
    }
    return existing.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { name: account.name }
  });

  if (error || !data?.user?.id) {
    throw new Error(`Failed to create auth user ${account.email}: ${error?.message ?? "Unknown error"}`);
  }

  authUsersByEmail.set(key, data.user);
  return data.user.id;
}

async function upsertSkills(adminClient, skills) {
  const normalizedSkills = Array.from(new Set(skills.map(normalizeSkill).filter(Boolean)));
  if (normalizedSkills.length === 0) {
    return [];
  }

  const { error: upsertError } = await adminClient
    .from("skill_tags")
    .upsert(normalizedSkills.map((skillName) => ({ skill_name: skillName })), {
      onConflict: "skill_name"
    });
  if (upsertError) {
    throw new Error(`Failed to upsert skill tags: ${upsertError.message}`);
  }

  const { data, error } = await adminClient
    .from("skill_tags")
    .select("skill_id, skill_name")
    .in("skill_name", normalizedSkills);

  if (error) {
    throw new Error(`Failed to read skill tags: ${error.message}`);
  }

  const skillIdByName = new Map(
    (data ?? []).map((row) => [String(row.skill_name), String(row.skill_id)])
  );

  return normalizedSkills
    .map((skillName) => skillIdByName.get(skillName))
    .filter(Boolean);
}

async function seedAccount(adminClient, account, authUsersByEmail) {
  const userId = await getOrCreateAuthUser(adminClient, account, authUsersByEmail);

  const { error: userError } = await adminClient.from("users").upsert(
    {
      user_id: userId,
      email: account.email,
      name: account.name,
      headline: account.headline,
      role_type: account.roleType,
      target_roles: account.targetRoles
    },
    { onConflict: "user_id" }
  );

  if (userError) {
    throw new Error(`Failed to upsert users row for ${account.email}: ${userError.message}`);
  }

  const { error: profileError } = await adminClient.from("candidate_profiles").upsert(
    {
      user_id: userId,
      bio: account.bio,
      contact_email: account.contactEmail,
      portfolio_links: account.portfolioLinks,
      profile_completion_score: 100
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    throw new Error(`Failed to upsert profile row for ${account.email}: ${profileError.message}`);
  }

  const { error: clearProjectsError } = await adminClient.from("projects").delete().eq("user_id", userId);
  if (clearProjectsError) {
    throw new Error(`Failed to clear existing projects for ${account.email}: ${clearProjectsError.message}`);
  }

  const createdProjectIds = [];
  const createdOpportunityIds = [];

  const projects = Array.isArray(account.projects) ? account.projects : [];
  for (const project of projects) {
    const { data: projectData, error: projectError } = await adminClient
      .from("projects")
      .insert({
        user_id: userId,
        title: project.title,
        problem_solved: project.problemSolved,
        what_was_built: project.whatWasBuilt,
        category: project.category,
        impact: project.impact
      })
      .select("project_id")
      .single();

    if (projectError || !projectData?.project_id) {
      throw new Error(`Failed to insert project "${project.title}": ${projectError?.message ?? "Unknown error"}`);
    }

    const projectId = String(projectData.project_id);
    createdProjectIds.push(projectId);
    const skillIds = await upsertSkills(adminClient, project.skills ?? []);

    if (skillIds.length > 0) {
      const { error: projectSkillsError } = await adminClient.from("project_skills").insert(
        skillIds.map((skillId) => ({
          project_id: projectId,
          skill_id: skillId
        }))
      );
      if (projectSkillsError) {
        throw new Error(`Failed to insert project skills for "${project.title}": ${projectSkillsError.message}`);
      }
    }

    const artifacts = Array.isArray(project.artifacts) ? project.artifacts : [];
    if (artifacts.length > 0) {
      const { error: artifactsError } = await adminClient.from("artifacts").insert(
        artifacts.map((artifact) => ({
          project_id: projectId,
          artifact_type: normalizeArtifactType(artifact.type, artifact.url),
          artifact_url: artifact.url,
          preview_url:
            typeof artifact.previewUrl === "string" && artifact.previewUrl.trim().length > 0
              ? artifact.previewUrl.trim()
              : null
        }))
      );
      if (artifactsError) {
        throw new Error(`Failed to insert artifacts for "${project.title}": ${artifactsError.message}`);
      }
    }
  }

  const { error: clearOpportunitiesError } = await adminClient
    .from("opportunities")
    .delete()
    .eq("recruiter_id", userId);
  if (clearOpportunitiesError) {
    throw new Error(
      `Failed to clear existing opportunities for ${account.email}: ${clearOpportunitiesError.message}`
    );
  }

  const opportunities = Array.isArray(account.opportunities) ? account.opportunities : [];
  for (const opportunity of opportunities) {
    const { data: opportunityData, error: opportunityError } = await adminClient
      .from("opportunities")
      .insert({
        recruiter_id: userId,
        title: opportunity.title,
        company: opportunity.company,
        description: opportunity.description,
        skills_sought: (opportunity.skillsSought || []).map(normalizeSkill)
      })
      .select("opportunity_id")
      .single();

    if (opportunityError || !opportunityData?.opportunity_id) {
      throw new Error(
        `Failed to insert opportunity "${opportunity.title}": ${opportunityError?.message ?? "Unknown error"}`
      );
    }
    createdOpportunityIds.push(String(opportunityData.opportunity_id));
  }

  return { userId, createdProjectIds, createdOpportunityIds };
}

async function seedInteractions(adminClient, seededAccounts) {
  const demoUserIds = seededAccounts.map((account) => account.userId);
  const firstProjectByUser = new Map(
    seededAccounts.map((account) => [account.userId, account.createdProjectIds[0] || null])
  );

  if (demoUserIds.length === 0) {
    return;
  }

  await adminClient.from("saved_projects").delete().in("user_id", demoUserIds);
  await adminClient.from("inspired_projects").delete().in("user_id", demoUserIds);

  const projectAccounts = seededAccounts.filter((account) => account.createdProjectIds.length > 0);
  const [a, b, c] = projectAccounts;
  const savedRows = [];
  const inspiredRows = [];

  if (a && b && firstProjectByUser.get(b.userId)) {
    savedRows.push({ user_id: a.userId, project_id: firstProjectByUser.get(b.userId) });
  }
  if (b && c && firstProjectByUser.get(c.userId)) {
    savedRows.push({ user_id: b.userId, project_id: firstProjectByUser.get(c.userId) });
  }
  if (c && a && firstProjectByUser.get(a.userId)) {
    savedRows.push({ user_id: c.userId, project_id: firstProjectByUser.get(a.userId) });
  }

  if (a && c && firstProjectByUser.get(c.userId)) {
    inspiredRows.push({ user_id: a.userId, project_id: firstProjectByUser.get(c.userId) });
  }
  if (b && a && firstProjectByUser.get(a.userId)) {
    inspiredRows.push({ user_id: b.userId, project_id: firstProjectByUser.get(a.userId) });
  }
  if (c && b && firstProjectByUser.get(b.userId)) {
    inspiredRows.push({ user_id: c.userId, project_id: firstProjectByUser.get(b.userId) });
  }

  if (savedRows.length > 0) {
    const { error } = await adminClient.from("saved_projects").insert(savedRows);
    if (error) {
      throw new Error(`Failed to seed saved projects: ${error.message}`);
    }
  }

  if (inspiredRows.length > 0) {
    const { error } = await adminClient.from("inspired_projects").insert(inspiredRows);
    if (error) {
      throw new Error(`Failed to seed inspired projects: ${error.message}`);
    }
  }
}

async function seedMatches(adminClient, seededAccounts) {
  const seededOpportunityIds = seededAccounts.flatMap(
    (account) => account.createdOpportunityIds || []
  );
  const candidateUserIds = seededAccounts
    .filter((account) => (account.createdProjectIds || []).length > 0)
    .map((account) => account.userId);

  if (seededOpportunityIds.length === 0 || candidateUserIds.length === 0) {
    return 0;
  }

  const [opportunityRowsResult, projectRowsResult] = await Promise.all([
    adminClient
      .from("opportunities")
      .select("opportunity_id, skills_sought")
      .in("opportunity_id", seededOpportunityIds),
    adminClient
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
      .in("user_id", candidateUserIds)
  ]);

  if (opportunityRowsResult.error) {
    throw new Error(`Failed to fetch opportunities for seeded matching: ${opportunityRowsResult.error.message}`);
  }
  if (projectRowsResult.error) {
    throw new Error(`Failed to fetch candidate evidence for seeded matching: ${projectRowsResult.error.message}`);
  }

  const evidenceByUser = new Map(
    candidateUserIds.map((userId) => [
      userId,
      {
        userId,
        skills: [],
        projectCount: 0,
        projectsWithImpact: 0,
        projectsWithArtifacts: 0
      }
    ])
  );

  (projectRowsResult.data || []).forEach((row) => {
    const userId = String(row.user_id || "");
    const current = evidenceByUser.get(userId);
    if (!current) {
      return;
    }

    current.projectCount += 1;
    if (String(row.impact || "").trim().length > 0) {
      current.projectsWithImpact += 1;
    }
    if (Array.isArray(row.artifacts) && row.artifacts.length > 0) {
      current.projectsWithArtifacts += 1;
    }

    const projectSkills = Array.isArray(row.project_skills) ? row.project_skills : [];
    projectSkills.forEach((entry) => {
      const skill = normalizeSkill(entry?.skill_tags?.skill_name || "");
      if (skill) {
        current.skills.push(skill);
      }
    });
  });

  const matchRows = [];
  (opportunityRowsResult.data || []).forEach((opportunity) => {
    const opportunityId = String(opportunity.opportunity_id || "");
    const opportunitySkills = normalizeSkills(opportunity.skills_sought || []);

    evidenceByUser.forEach((candidateEvidence, userId) => {
      const result = calculateMatchScore(opportunitySkills, candidateEvidence);
      if (result.score < 20) {
        return;
      }
      matchRows.push({
        user_id: userId,
        opportunity_id: opportunityId,
        match_score: result.score,
        match_rationale: result.reasons
      });
    });
  });

  const { error: clearMatchesError } = await adminClient
    .from("matches")
    .delete()
    .in("opportunity_id", seededOpportunityIds);
  if (clearMatchesError) {
    throw new Error(`Failed to clear seeded matches: ${clearMatchesError.message}`);
  }

  if (matchRows.length > 0) {
    const { error: insertMatchesError } = await adminClient.from("matches").insert(matchRows);
    if (insertMatchesError) {
      throw new Error(`Failed to insert seeded matches: ${insertMatchesError.message}`);
    }
  }

  return matchRows.length;
}

async function main() {
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const demoAccountsPath = path.join(projectRoot, "data", "demo-accounts.json");
  const demoAccounts = JSON.parse(fs.readFileSync(demoAccountsPath, "utf8"));

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const authUsers = await fetchAllAuthUsers(adminClient);
  const authUsersByEmail = new Map(
    authUsers
      .filter((user) => typeof user.email === "string" && user.email.length > 0)
      .map((user) => [String(user.email).toLowerCase(), user])
  );

  const seededAccounts = [];
  for (const account of demoAccounts) {
    const seeded = await seedAccount(adminClient, account, authUsersByEmail);
    seededAccounts.push({
      id: account.id,
      email: account.email,
      password: account.password,
      userId: seeded.userId,
      createdProjectIds: seeded.createdProjectIds,
      createdOpportunityIds: seeded.createdOpportunityIds
    });
  }

  await seedInteractions(adminClient, seededAccounts);
  const seededMatchCount = await seedMatches(adminClient, seededAccounts);

  const seededProjectCount = seededAccounts.reduce(
    (total, account) => total + account.createdProjectIds.length,
    0
  );
  const seededOpportunityCount = seededAccounts.reduce(
    (total, account) => total + (account.createdOpportunityIds?.length ?? 0),
    0
  );

  console.log(
    `Seeded ${seededAccounts.length} demo accounts, ${seededProjectCount} projects, ${seededOpportunityCount} opportunities, and ${seededMatchCount} matches.`
  );
  console.log("Credentials:");
  seededAccounts.forEach((account) => {
    console.log(`- ${account.email} / ${account.password}`);
  });
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});
