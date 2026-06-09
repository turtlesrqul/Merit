import type { CookieOptionsWithName } from "@supabase/ssr";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export const supabaseAuthCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
};
