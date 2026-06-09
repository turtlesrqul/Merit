type AuthErrorContext =
  | "signup"
  | "signin"
  | "resend-signup"
  | "forgot-password"
  | "reset-password";

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return "";
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function isRateLimitedAuthError(error: unknown) {
  const status = readErrorStatus(error);
  if (status === 429) {
    return true;
  }

  const normalizedMessage = readErrorMessage(error).toLowerCase();
  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("email rate") ||
    normalizedMessage.includes("security purposes")
  );
}

export function isUserAlreadyExistsError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("user already")
  );
}

function isInvalidCredentialsError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials") ||
    normalizedMessage.includes("invalid email or password")
  );
}

function isEmailNotConfirmedError(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

function isWeakPasswordError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("password should be at least") || normalizedMessage.includes("weak password");
}

function isExpiredOrInvalidResetLinkError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("invalid flow state") ||
    normalizedMessage.includes("otp expired") ||
    normalizedMessage.includes("invalid otp") ||
    normalizedMessage.includes("invalid token")
  );
}

function isAuthSessionMissingError(message: string) {
  return message.toLowerCase().includes("auth session missing");
}

export function mapSupabaseAuthError(error: unknown, context: AuthErrorContext) {
  const message = readErrorMessage(error);

  if (context === "signup" && isRateLimitedAuthError(error)) {
    return "Too many signup emails were requested at once. Please try again later.";
  }
  if (context === "resend-signup" && isRateLimitedAuthError(error)) {
    return "Too many verification emails were requested at once. Please try again later.";
  }
  if (context === "forgot-password" && isRateLimitedAuthError(error)) {
    return "Too many password reset requests were sent. Please try again later.";
  }

  if (context === "signin") {
    if (isInvalidCredentialsError(message)) {
      return "Invalid email or password.";
    }
    if (isEmailNotConfirmedError(message)) {
      return "Email not confirmed yet. Please verify your email first.";
    }
  }

  if ((context === "signup" || context === "reset-password") && isWeakPasswordError(message)) {
    return "Password must be at least 8 characters.";
  }

  if (context === "reset-password") {
    if (isExpiredOrInvalidResetLinkError(message)) {
      return "This reset link is invalid or expired. Request a new password reset email.";
    }
    if (isAuthSessionMissingError(message)) {
      return "Reset session missing. Open the latest reset link from your email again.";
    }
  }

  return message || "Something went wrong. Please try again.";
}
