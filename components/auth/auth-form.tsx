"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
  initialEmail?: string;
  initialPassword?: string;
  autoSignIn?: boolean;
  switchFromCurrentSession?: boolean;
};

export function AuthForm({
  mode,
  initialEmail,
  initialPassword,
  autoSignIn = false,
  switchFromCurrentSession = false
}: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState(initialPassword ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoAttemptedRef = useRef(false);

  const isSignUp = mode === "sign-up";

  const signInWithCredentials = async (shouldSwitchSession: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createBrowserSupabaseClient();

    if (shouldSwitchSession) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (autoSignIn) {
        setErrorMessage(
          `${error.message} Demo login may not be seeded yet. Run npm run seed:demo after adding SUPABASE_SERVICE_ROLE_KEY.`
        );
      } else {
        setErrorMessage(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createBrowserSupabaseClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setSuccessMessage("Check your email to confirm your account, then sign in.");
        setIsSubmitting(false);
        return;
      }

      router.push("/home");
      router.refresh();
      setIsSubmitting(false);
      return;
    }

    await signInWithCredentials(false);
  };

  useEffect(() => {
    if (isSignUp || !autoSignIn || autoAttemptedRef.current) {
      return;
    }
    if (!email || !password) {
      return;
    }

    autoAttemptedRef.current = true;
    void signInWithCredentials(switchFromCurrentSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSignIn, email, isSignUp, password, switchFromCurrentSession]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] items-center px-5 py-10">
      <Card className="mx-auto w-full max-w-lg space-y-5 border-sun-200">
        <div className="space-y-2">
          <p className="inline-flex rounded-full border border-sun-200 bg-sun-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-700">
            Merit Access
          </p>
          <h1 className="text-3xl font-semibold text-ink-950">
          {isSignUp ? "Create your Merit account" : "Welcome back"}
          </h1>
          <p className="text-sm text-ink-700">
            {isSignUp
              ? "Start building a profile around proof of work."
              : "Sign in to continue building your proof profile."}
          </p>
          {!isSignUp && autoSignIn ? (
            <p className="text-xs font-medium text-ink-600">
              Switching you into the selected demo account...
            </p>
          ) : !isSignUp && initialEmail ? (
            <p className="text-xs font-medium text-ink-600">
              Demo credentials loaded. Click sign in to continue.
            </p>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignUp ? (
            <label className="block space-y-2 text-sm text-ink-900">
              Full name
              <Input
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Avery Tan"
                required
                value={name}
              />
            </label>
          ) : null}

          <label className="block space-y-2 text-sm text-ink-900">
            Email
            <Input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2 text-sm text-ink-900">
            Password
            <Input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Sign up"
                : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-ink-700">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            className="font-semibold text-ink-950 underline decoration-sun-400 underline-offset-4"
            href={isSignUp ? "/sign-in" : "/sign-up"}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </Card>
    </main>
  );
}
