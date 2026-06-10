"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveSafeAuthNext, resolveSignupEmailCallbackUrl } from "@/lib/auth/auth-urls";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isRateLimitedAuthError, mapSupabaseAuthError } from "@/lib/auth/auth-errors";
import {
  getSupportEmail,
  getSupportInstagramHandle,
  getSupportInstagramUrl,
  getSupportUrl
} from "@/lib/public-config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

const PENDING_SIGNUP_EMAIL_KEY = "merit_pending_signup_email";
const LAST_SIGNUP_EMAIL_SENT_AT_KEY = "merit_last_signup_email_sent_at";
const EMAIL_RESEND_COOLDOWN_MS = 60_000;

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  const normalized = normalizeEmailAddress(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supportEmail = getSupportEmail();
  const supportInstagramHandle = getSupportInstagramHandle();
  const supportInstagramUrl = getSupportInstagramUrl();
  const supportUrl = getSupportUrl();
  const nextPath = resolveSafeAuthNext(searchParams.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>("");
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState<number>(0);
  const [resendSecondsRemaining, setResendSecondsRemaining] = useState(0);

  const isSignUp = mode === "sign-up";
  const emailCallbackUrl = resolveSignupEmailCallbackUrl(nextPath);

  const redirectAfterAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign(nextPath);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }, [nextPath, router]);

  const savePendingSignupState = (pendingEmail: string) => {
    const normalizedEmail = normalizeEmailAddress(pendingEmail);
    const now = Date.now();
    setPendingVerificationEmail(normalizedEmail);
    setResendAvailableAtMs(now + EMAIL_RESEND_COOLDOWN_MS);
    try {
      window.localStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, normalizedEmail);
      window.localStorage.setItem(LAST_SIGNUP_EMAIL_SENT_AT_KEY, String(now));
    } catch {
      // Ignore storage write failures in locked-down browsers.
    }
  };

  const clearPendingSignupState = () => {
    setPendingVerificationEmail("");
    setResendAvailableAtMs(0);
    setResendSecondsRemaining(0);
    try {
      window.localStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
      window.localStorage.removeItem(LAST_SIGNUP_EMAIL_SENT_AT_KEY);
    } catch {
      // Ignore storage write failures in locked-down browsers.
    }
  };

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isMounted = true;

    const restoreSession = async () => {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (!isMounted || error || !session) {
        return;
      }

      clearPendingSignupState();
      redirectAfterAuth();
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [redirectAfterAuth]);

  useEffect(() => {
    if (!isSignUp) {
      return;
    }

    try {
      const storedEmail = window.localStorage.getItem(PENDING_SIGNUP_EMAIL_KEY);
      const storedSentAt = window.localStorage.getItem(LAST_SIGNUP_EMAIL_SENT_AT_KEY);
      if (!storedEmail) {
        return;
      }

      const normalizedEmail = normalizeEmailAddress(storedEmail);
      const sentAtMs = storedSentAt ? Number(storedSentAt) : 0;
      if (!Number.isFinite(sentAtMs) || sentAtMs <= 0) {
        setPendingVerificationEmail(normalizedEmail);
        return;
      }

      setPendingVerificationEmail(normalizedEmail);
      setResendAvailableAtMs(sentAtMs + EMAIL_RESEND_COOLDOWN_MS);
    } catch {
      // Ignore storage read failures.
    }
  }, [isSignUp]);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (!authError) {
      return;
    }
    setErrorMessage(authError);
  }, [searchParams]);

  useEffect(() => {
    if (!isSignUp || !resendAvailableAtMs) {
      setResendSecondsRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remainingMs = resendAvailableAtMs - Date.now();
      setResendSecondsRemaining(remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0);
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [isSignUp, resendAvailableAtMs]);

  const signInWithCredentials = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createBrowserSupabaseClient();
    const normalizedEmail = normalizeEmailAddress(email);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setPendingVerificationEmail(normalizedEmail);
        savePendingSignupState(normalizedEmail);
        setSuccessMessage("Your account exists but email is not confirmed yet. Use \"Resend verification email\" below.");
      } else {
        setErrorMessage(mapSupabaseAuthError(error, "signin"));
      }
      setIsSubmitting(false);
      return;
    }

    clearPendingSignupState();
    redirectAfterAuth();
    setIsSubmitting(false);
  };

  const resendConfirmationEmail = async () => {
    const fallbackEmail = normalizeEmailAddress(email);
    const resendEmail = pendingVerificationEmail || (isValidEmail(fallbackEmail) ? fallbackEmail : "");
    if (!resendEmail) {
      setErrorMessage("Enter your email first so we know where to resend confirmation.");
      return;
    }

    if (resendSecondsRemaining > 0) {
      setErrorMessage(`Please wait ${resendSecondsRemaining}s before requesting another confirmation email.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResendingConfirmation(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail,
        options: {
          emailRedirectTo: emailCallbackUrl
        }
      });

      if (error) {
        if (isRateLimitedAuthError(error)) {
          setErrorMessage(mapSupabaseAuthError(error, "resend-signup"));
          setResendAvailableAtMs(Date.now() + EMAIL_RESEND_COOLDOWN_MS);
          return;
        }
        setErrorMessage(mapSupabaseAuthError(error, "resend-signup"));
        return;
      }

      const now = Date.now();
      setPendingVerificationEmail(resendEmail);
      setResendAvailableAtMs(now + EMAIL_RESEND_COOLDOWN_MS);
      try {
        window.localStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, resendEmail);
        window.localStorage.setItem(LAST_SIGNUP_EMAIL_SENT_AT_KEY, String(now));
      } catch {
        // Ignore storage write failures.
      }
      setSuccessMessage(`Confirmation email sent to ${resendEmail}. Check inbox and spam.`);
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isResendingConfirmation) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createBrowserSupabaseClient();

    if (isSignUp) {
      const normalizedEmail = normalizeEmailAddress(email);

      if (!acceptedTerms) {
        setErrorMessage("Please accept the Terms and Privacy Policy to continue.");
        setIsSubmitting(false);
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        setErrorMessage("Enter a valid email address.");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters.");
        setIsSubmitting(false);
        return;
      }

      if (pendingVerificationEmail === normalizedEmail && resendSecondsRemaining > 0) {
        setErrorMessage(
          `We already sent a confirmation email recently. Please wait ${resendSecondsRemaining}s, then resend if needed.`
        );
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: emailCallbackUrl,
          data: {
            name
          }
        }
      });

      if (error) {
        if (isRateLimitedAuthError(error)) {
          savePendingSignupState(normalizedEmail);
          setErrorMessage(mapSupabaseAuthError(error, "signup"));
          setSuccessMessage(`Pending verification email: ${normalizedEmail}`);
          setIsSubmitting(false);
          return;
        }

        setErrorMessage(mapSupabaseAuthError(error, "signup"));
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        savePendingSignupState(normalizedEmail);
        setSuccessMessage("Account created. Please check your email to verify your account. Check spam too.");
        setIsSubmitting(false);
        return;
      }

      clearPendingSignupState();
      redirectAfterAuth();
      setIsSubmitting(false);
      return;
    }

    if (!isValidEmail(normalizeEmailAddress(email))) {
      setErrorMessage("Enter a valid email address.");
      setIsSubmitting(false);
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    await signInWithCredentials();
  };

  return (
    <main className="editorial-container flex min-h-[calc(100vh-4rem)] items-center py-10">
      <Card className="mx-auto w-full max-w-lg space-y-6 bg-transparent">
        <div className="space-y-5 text-center">
          <p className="label-caps mx-auto">Merit Access</p>
          <h1 className="font-serif text-4xl leading-tight text-[#16130f]">
            {isSignUp ? "Create your Merit account" : "Welcome back"}
          </h1>
          <p className="mx-auto max-w-md text-base leading-7 text-[#7b705f]">
            {isSignUp
              ? "Start building a profile around proof of work."
              : "Sign in to continue building your proof profile."}
          </p>
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
          {isSignUp ? (
            <label className="flex items-start gap-2 text-sm text-[#4b4439]">
              <input
                checked={acceptedTerms}
                className="mt-0.5 h-4 w-4"
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                type="checkbox"
              />
              <span>
                I agree to the{" "}
                <Link className="underline decoration-[#f3c945] underline-offset-4" href="/terms">
                  Terms
                </Link>{" "}
                and{" "}
                <Link className="underline decoration-[#f3c945] underline-offset-4" href="/privacy">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          ) : null}

          {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <Button className="w-full" disabled={isSubmitting || isResendingConfirmation} type="submit">
            {isSubmitting
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Sign up"
                : "Sign in"}
          </Button>
        </form>

        {!isSignUp ? (
          <p className="text-sm text-[#7b705f]">
            <Link className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4" href="/forgot-password">
              Forgot password?
            </Link>
          </p>
        ) : null}

        {pendingVerificationEmail ? (
          <div className="border border-[#d7cebd] bg-[#eee8dd] p-4">
            <p className="text-sm text-[#7b705f]">
              Pending verification email: <strong>{pendingVerificationEmail}</strong>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                disabled={isResendingConfirmation || resendSecondsRemaining > 0 || isSubmitting}
                onClick={resendConfirmationEmail}
                type="button"
                variant="secondary"
              >
                {isResendingConfirmation
                  ? "Sending..."
                  : resendSecondsRemaining > 0
                    ? `Resend in ${resendSecondsRemaining}s`
                    : "Resend verification email"}
              </Button>
            </div>
          </div>
        ) : null}

        <p className="text-sm text-[#7b705f]">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            className="text-[#16130f] underline decoration-[#f3c945] underline-offset-4"
            href={isSignUp ? "/sign-in" : "/sign-up"}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
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

