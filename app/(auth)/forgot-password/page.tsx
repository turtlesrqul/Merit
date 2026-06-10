"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isRateLimitedAuthError, mapSupabaseAuthError } from "@/lib/auth/auth-errors";
import { resolvePasswordResetRedirectUrl } from "@/lib/auth/auth-urls";
import {
  getSupportEmail,
  getSupportInstagramHandle,
  getSupportInstagramUrl,
  getSupportUrl
} from "@/lib/public-config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  const normalized = normalizeEmailAddress(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export default function ForgotPasswordPage() {
  const supportEmail = getSupportEmail();
  const supportInstagramHandle = getSupportInstagramHandle();
  const supportInstagramUrl = getSupportInstagramUrl();
  const supportUrl = getSupportUrl();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmailAddress(email);
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resolvePasswordResetRedirectUrl()
      });

      if (error && isRateLimitedAuthError(error)) {
        setErrorMessage(mapSupabaseAuthError(error, "forgot-password"));
        return;
      }

      setSuccessMessage("If an account exists, we sent a password reset link.");
    } catch {
      setSuccessMessage("If an account exists, we sent a password reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="editorial-container flex min-h-[calc(100vh-4rem)] items-center py-10">
      <Card className="mx-auto w-full max-w-lg space-y-6 bg-transparent">
        <div className="space-y-5 text-center">
          <h1 className="font-serif text-4xl leading-tight text-[#16130f]">Reset your password</h1>
          <p className="mx-auto max-w-md text-base leading-7 text-[#7b705f]">Enter your email and we will send a reset link.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
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

          {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>

        <p className="text-sm text-[#7b705f]">
          Back to{" "}
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
