import { DEMO_ACCOUNTS } from "@/lib/demo/accounts";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type DbClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type DemoShowcaseAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  headline: string;
  userId: string | null;
  projectCount: number;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function fetchDemoShowcaseAccounts(
  supabase: DbClient
): Promise<DemoShowcaseAccount[]> {
  const emails = DEMO_ACCOUNTS.map((account) => account.email);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("user_id, email, name, headline")
    .in("email", emails);

  if (usersError) {
    throw new Error(`Failed to fetch demo users: ${usersError.message}`);
  }

  const rows = (users ?? []) as Array<Record<string, unknown>>;
  const usersByEmail = new Map(
    rows.map((row) => [
      safeString(row.email).toLowerCase(),
      {
        userId: safeString(row.user_id) || null,
        name: safeString(row.name),
        headline: safeString(row.headline)
      }
    ])
  );

  const demoUserIds = rows.map((row) => safeString(row.user_id)).filter(Boolean);
  const projectCountByUserId = new Map<string, number>();

  if (demoUserIds.length > 0) {
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("user_id")
      .in("user_id", demoUserIds);

    if (projectsError) {
      throw new Error(`Failed to fetch demo projects: ${projectsError.message}`);
    }

    ((projects ?? []) as Array<Record<string, unknown>>).forEach((row) => {
      const userId = safeString(row.user_id);
      if (!userId) {
        return;
      }
      projectCountByUserId.set(userId, (projectCountByUserId.get(userId) ?? 0) + 1);
    });
  }

  return DEMO_ACCOUNTS.map((account) => {
    const existing = usersByEmail.get(account.email.toLowerCase());
    const userId = existing?.userId ?? null;

    return {
      id: account.id,
      name: existing?.name || account.name,
      email: account.email,
      password: account.password,
      headline: existing?.headline || account.headline,
      userId,
      projectCount: userId ? projectCountByUserId.get(userId) ?? 0 : 0
    };
  });
}
