"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { mapSupabaseAuthError } from "@/lib/auth/auth-errors";
import {
  getSupportEmail,
  getSupportInstagramHandle,
  getSupportInstagramUrl,
  getSupportUrl
} from "@/lib/public-config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function readRecoveryHashSession() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const type = hashParams.get("type");

  if (!accessToken || !refreshToken || type !== "recovery") {
    return null;
  }

  return {
    accessToken,
    refreshToken
  };
}

function clearLocationHash() {
  if (typeof window === "undefined" || !window.location.hash) {
    return;
  }

  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supportEmail = getSupportEmail();
  const supportInstagramHandle = getSupportInstagramHandle();
  const supportInstagramUrl = getSupportInstagramUrl();
  const supportUrl = getSupportUrl();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResetSession, setHasResetSession] = useState(false);

  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const tokenHash = useMemo(() => searchParams.get("token_hash"), [searchParams]);
  const otpType = useMemo(() => searchParams.get("type") as EmailOtpType | null, [searchParams]);
  const callbackError = useMemo(
    () => searchParams.get("error_description") ?? searchParams.get("error"),
    [searchParams]
  );

  useEffect(() => {
    let isMounted = true;

    const prepareSession = async () => {
      const supabase = createBrowserSupabaseClient();
      setIsPreparing(true);
      setErrorMessage(null);
      setHasResetSession(false);

      if (callbackError) {
        if (isMounted) {
          setErrorMessage("This reset link is invalid or expired. Request a new password reset email.");
          setIsPreparing(false);
        }
        return;
      }

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

      if (!code && tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: tokenHash
        });
        if (!isMounted) {
          return;
        }
        if (error) {
          setErrorMessage(mapSupabaseAuthError(error, "reset-password"));
          setIsPreparing(false);
          return;
        }
      }

      if (!code && !tokenHash) {
        const hashSession = readRecoveryHashSession();
        if (hashSession) {
          const { error } = await supabase.auth.setSession({
            access_token: hashSession.accessToken,
            refresh_token: hashSession.refreshToken
          });
          if (!isMounted) {
            return;
          }
          if (error) {
            setErrorMessage(mapSupabaseAuthError(error, "reset-password"));
            setIsPreparing(false);
            return;
          }
          clearLocationHash();
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!session) {
        setErrorMessage("This reset link could not be loaded. Request a fresh password reset email and open the latest link.");
      } else {
        setHasResetSession(true);
      }
      setIsPreparing(false);
    };

    void prepareSession();
    return () => {
      isMounted = false;
    };
  }, [callbackError, code, otpType, tokenHash]);

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
    <main className="editorial-container flex min-h-[calc(100vh-4rem)] items-center py-10">
      <Card className="mx-auto w-full max-w-lg space-y-6 bg-transparent">
        <div className="space-y-5 text-center">
          <h1 className="font-serif text-4xl leading-tight text-[#16130f]">Set a new password</h1>
          <p className="mx-auto max-w-md text-base leading-7 text-[#7b705f]">Choose a new password for your account.</p>
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

          <Button
            className="w-full"
            disabled={isPreparing || isSubmitting || !hasResetSession || Boolean(successMessage)}
            type="submit"
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </Button>
        </form>

        <p className="text-sm leading-6 text-[#7b705f]">
          Need another link?{" "}
          <Link className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4" href="/forgot-password">
            Request a new password reset
          </Link>
          . Back to{" "}
          <Link className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4" href="/sign-in">
            sign in
          </Link>
          .
        </p>
        <p className="text-xs leading-5 text-[#7b705f]">
          Need help? Contact{" "}
          <a
            className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4"
            href={supportUrl}
            rel="noreferrer"
            target="_blank"
          >
            {supportEmail}
          </a>{" "}
          or{" "}
          <a
            className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4"
            href={supportInstagramUrl}
            rel="noreferrer"
            target="_blank"
          >
            {supportInstagramHandle}
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
