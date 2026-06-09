import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSupabaseUrl(value: string) {
  const cleaned = stripWrappingQuotes(value);
  const withoutRestPath = cleaned.replace(/\/rest\/v1\/?$/i, "");
  return withoutRestPath.replace(/\/+$/g, "");
}

function getSupabaseEnvOrNull() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  const anonKey = rawAnonKey ? stripWrappingQuotes(rawAnonKey) : "";

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

const supabaseAuthCookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
} satisfies CookieOptions;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request
  });
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return response;
  }
  const { url, anonKey } = env;

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set({
            name,
            value,
            ...(options ?? {})
          })
        );

        response = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Keep existing cookies for transient auth/network errors; this avoids accidental forced sign-outs.
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
