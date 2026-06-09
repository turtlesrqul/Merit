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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
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
  const explicitDemoEmails = unique(
    demoAccounts.map((account) => String(account.email || "").toLowerCase())
  );

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: usersRows, error: usersError } = await adminClient
    .from("users")
    .select("user_id, email")
    .ilike("email", "%.demo@merit.app");

  if (usersError) {
    throw new Error(`Failed to fetch demo users: ${usersError.message}`);
  }

  const userIdsFromUsersTable = (usersRows ?? [])
    .map((row) => String(row.user_id || ""))
    .filter(Boolean);

  const authUsers = await fetchAllAuthUsers(adminClient);
  const authUserIds = authUsers
    .filter((user) => {
      const email = String(user.email || "").toLowerCase();
      return email.endsWith(".demo@merit.app") || explicitDemoEmails.includes(email);
    })
    .map((user) => user.id);

  const demoUserIds = unique([...userIdsFromUsersTable, ...authUserIds]);

  if (demoUserIds.length === 0) {
    console.log("No demo users found. Nothing to clear.");
    return;
  }

  const { data: projectsRows, error: projectsError } = await adminClient
    .from("projects")
    .select("project_id")
    .in("user_id", demoUserIds);
  if (projectsError) {
    throw new Error(`Failed to fetch demo projects: ${projectsError.message}`);
  }
  const demoProjectIds = (projectsRows ?? [])
    .map((row) => String(row.project_id || ""))
    .filter(Boolean);

  const { data: opportunitiesRows, error: opportunitiesError } = await adminClient
    .from("opportunities")
    .select("opportunity_id")
    .in("recruiter_id", demoUserIds);
  if (opportunitiesError) {
    throw new Error(`Failed to fetch demo opportunities: ${opportunitiesError.message}`);
  }
  const demoOpportunityIds = (opportunitiesRows ?? [])
    .map((row) => String(row.opportunity_id || ""))
    .filter(Boolean);

  await adminClient.from("saved_projects").delete().in("user_id", demoUserIds);
  await adminClient.from("inspired_projects").delete().in("user_id", demoUserIds);
  await adminClient.from("project_views").delete().in("viewer_user_id", demoUserIds);
  await adminClient.from("project_reports").delete().in("reporter_user_id", demoUserIds);
  await adminClient.from("hidden_projects").delete().in("hidden_by", demoUserIds);

  if (demoProjectIds.length > 0) {
    await adminClient.from("saved_projects").delete().in("project_id", demoProjectIds);
    await adminClient.from("inspired_projects").delete().in("project_id", demoProjectIds);
    await adminClient.from("project_views").delete().in("project_id", demoProjectIds);
    await adminClient.from("project_reports").delete().in("project_id", demoProjectIds);
    await adminClient.from("hidden_projects").delete().in("project_id", demoProjectIds);
  }

  if (demoOpportunityIds.length > 0) {
    await adminClient.from("matches").delete().in("opportunity_id", demoOpportunityIds);
  }
  await adminClient.from("matches").delete().in("user_id", demoUserIds);

  await adminClient.from("opportunities").delete().in("recruiter_id", demoUserIds);
  await adminClient.from("projects").delete().in("user_id", demoUserIds);
  await adminClient.from("candidate_profiles").delete().in("user_id", demoUserIds);
  await adminClient.from("users").delete().in("user_id", demoUserIds);

  for (const authUserId of authUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(authUserId);
    if (error) {
      console.warn(`Warning: failed deleting auth user ${authUserId}: ${error.message}`);
    }
  }

  console.log(
    `Cleared demo data for ${demoUserIds.length} users, ${demoProjectIds.length} projects, and ${demoOpportunityIds.length} opportunities.`
  );
}

main().catch((error) => {
  console.error(`Clear failed: ${error.message}`);
  process.exit(1);
});
