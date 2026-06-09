"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { mapSupabaseAuthError } from "@/lib/auth/auth-errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const code = useMemo(() => searchParams.get("code"), [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const prepareSession = async () => {
      const supabase = createBrowserSupabaseClient();
      setIsPreparing(true);
      setErrorMessage(null);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) {
          return;
        }
        if (error) {
          setErrorMessage(mapSupabaseAuthError(error, "reset-password"));
          setIsPreparing(false);
          return;
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!session) {
        setErrorMessage("Reset session missing. Open the latest reset link from your email again.");
      }
      setIsPreparing(false);
    };

    void prepareSession();
    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPreparing || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(mapSupabaseAuthError(error, "reset-password"));
        return;
      }

      setSuccessMessage("Password updated successfully. Redirecting to sign in...");
      await supabase.auth.signOut();
      window.setTimeout(() => {
        router.replace("/sign-in");
      }, 900);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="editorial-container flex min-h-[calc(100vh-4rem)] items-center py-16">
      <Card className="mx-auto w-full max-w-xl space-y-8 bg-transparent">
        <div className="space-y-5 text-center">
          <h1 className="font-serif text-5xl leading-tight text-[#16130f]">Set a new password</h1>
          <p className="mx-auto max-w-md text-lg leading-8 text-[#7b705f]">Choose a new password for your account.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm text-ink-900">
            New password
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="block space-y-2 text-sm text-ink-900">
            Confirm password
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          {isPreparing ? <p className="text-sm text-ink-700">Preparing reset session...</p> : null}
          {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <Button className="w-full" disabled={isPreparing || isSubmitting || Boolean(successMessage)} type="submit">
            {isSubmitting ? "Updating password..." : "Update password"}
          </Button>
        </form>

        <p className="text-sm text-[#7b705f]">
          Back to{" "}
          <Link className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4" href="/sign-in">
            sign in
          </Link>
          .
        </p>
      </Card>
    </main>
  );
}
