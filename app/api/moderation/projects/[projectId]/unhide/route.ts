import { NextResponse } from "next/server";
import { isMissingRelationOrColumnError } from "@/lib/db/schema-compat";
import { isAdminEmail, isModerationEnabled } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";

type RouteParams = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  if (!isModerationEnabled()) {
    return NextResponse.json(
      { accepted: false, message: "Moderation actions are currently disabled." },
      { status: 202 }
    );
  }

  if (!getSupabaseEnvOrNull()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet for this environment." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { projectId } = await params;

  try {
    const adminClient = createAdminSupabaseClient();
    const { error } = await adminClient.from("hidden_projects").delete().eq("project_id", projectId);

    if (error) {
      if (isMissingRelationOrColumnError(error.message, ["hidden_projects"])) {
        return NextResponse.json(
          { accepted: false, message: "Moderation tables are not available yet." },
          { status: 202 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ hidden: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unhide project." },
      { status: 500 }
    );
  }
}
