import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { supabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnvOrNull();
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  if (!env) {
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
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
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as CookieOptions);
        });
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
