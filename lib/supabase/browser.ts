"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { supabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";

let cachedBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  cachedBrowserClient = createBrowserClient(url, anonKey, {
    cookieOptions: supabaseAuthCookieOptions
  });

  return cachedBrowserClient;
}
