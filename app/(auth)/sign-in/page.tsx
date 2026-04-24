import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getDemoAccountById } from "@/lib/demo/accounts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams: Promise<{
    demo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { demo } = await searchParams;
  const demoAccount = getDemoAccountById(demo);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && !demoAccount) {
    redirect("/home");
  }

  return (
    <AuthForm
      autoSignIn={Boolean(demoAccount)}
      initialEmail={demoAccount?.email}
      initialPassword={demoAccount?.password}
      mode="sign-in"
      switchFromCurrentSession={Boolean(user && demoAccount)}
    />
  );
}
