import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { supabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";

function resolveSafeNext(nextValue: string | null) {
  if (!nextValue || !nextValue.startsWith("/")) {
    return "/home";
  }
  return nextValue;
}

export async function GET(request: NextRequest) {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = resolveSafeNext(requestUrl.searchParams.get("next"));
  const successPath = nextPath;
  const redirectUrl = new URL(successPath, request.url);
  let response = NextResponse.redirect(redirectUrl);

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
          response.cookies.set(name, value, options as CookieOptions);
        });
      }
    }
  });

  let authErrorMessage: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      authErrorMessage = error.message;
    }
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash
    });
    if (error) {
      authErrorMessage = error.message;
    }
  } else {
    authErrorMessage = "Missing authentication token in callback URL.";
  }

  if (authErrorMessage) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("auth_error", authErrorMessage);
    response = NextResponse.redirect(signInUrl);
  }

  return response;
}
