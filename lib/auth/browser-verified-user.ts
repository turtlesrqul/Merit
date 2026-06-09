"use client";

import type { User } from "@supabase/supabase-js";
import { verificationRequiredMessage, isEmailVerified } from "@/lib/auth/verification";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function requireVerifiedBrowserUser(action: string): Promise<{
  supabase: ReturnType<typeof createBrowserSupabaseClient>;
  user: User;
}> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in again.");
  }
  if (!isEmailVerified(user)) {
    throw new Error(verificationRequiredMessage(action));
  }

  return { supabase, user };
}
