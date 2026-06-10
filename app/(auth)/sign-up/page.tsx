import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { resolveSafeAuthNext } from "@/lib/auth/auth-urls";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SignUpPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

function getNextPath(value: string | string[] | undefined) {
  return resolveSafeAuthNext(Array.isArray(value) ? value[0] : value);
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getNextPath(resolvedSearchParams?.next);
  const supabase = await createServerSupabaseClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const {
      data: { user: resolvedUser }
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    user = null;
  }

  if (user) {
    redirect(nextPath);
  }

  return <AuthForm mode="sign-up" />;
}
