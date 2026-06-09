import { NextResponse } from "next/server";
import { isEmailVerified, verificationRequiredMessage } from "@/lib/auth/verification";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import {
  upsertMatchesForOpportunity,
  upsertMatchesForRecruiter
} from "@/lib/db/opportunities";

type RequestBody = {
  opportunityId?: string;
};

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: verificationRequiredMessage("running the match engine") },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;

  try {
    if (body.opportunityId) {
      const matches = await upsertMatchesForOpportunity(supabase, user.id, body.opportunityId);
      return NextResponse.json({
        opportunityId: body.opportunityId,
        matchedCandidates: matches.length
      });
    }

    const results = await upsertMatchesForRecruiter(supabase, user.id);
    const totalMatches = results.reduce((acc, result) => acc + result.matches.length, 0);

    return NextResponse.json({
      opportunitiesProcessed: results.length,
      totalMatches
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run match engine." },
      { status: 400 }
    );
  }
}
