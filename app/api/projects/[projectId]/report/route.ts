import { NextResponse } from "next/server";
import { isEmailVerified, verificationRequiredMessage } from "@/lib/auth/verification";
import { isMissingRelationOrColumnError } from "@/lib/db/schema-compat";
import { isModerationEnabled } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";

type ReportBody = {
  reason?: string;
  details?: string;
};

type RouteParams = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  if (!isModerationEnabled()) {
    return NextResponse.json(
      { accepted: false, message: "Reporting is currently disabled." },
      { status: 202 }
    );
  }

  if (!getSupabaseEnvOrNull()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet for this environment." },
      { status: 503 }
    );
  }

  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as ReportBody;
  const reason = (body.reason ?? "inappropriate-content").trim().slice(0, 120) || "inappropriate-content";
  const details = (body.details ?? "").trim().slice(0, 1000);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: verificationRequiredMessage("reporting projects") },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("project_reports").insert({
    project_id: projectId,
    reporter_user_id: user.id,
    reason,
    details
  });

  if (error) {
    if (isMissingRelationOrColumnError(error.message, ["project_reports"])) {
      return NextResponse.json(
        { accepted: false, message: "Reporting is temporarily unavailable while moderation tables are being set up." },
        { status: 202 }
      );
    }
    return NextResponse.json(
      { error: `Failed to submit report: ${error.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ accepted: true });
}
