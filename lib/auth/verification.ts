type UserLike = {
  email_confirmed_at?: string | null;
};

function isDevelopmentVerificationBypassEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function isEmailVerified(user: UserLike | null | undefined) {
  if (!user) {
    return false;
  }
  if (isDevelopmentVerificationBypassEnabled()) {
    return true;
  }
  return Boolean(user?.email_confirmed_at);
}

export function verificationRequiredMessage(action: string) {
  return `Verify your email before ${action}.`;
}
