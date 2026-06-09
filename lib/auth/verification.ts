type UserLike = {
  email_confirmed_at?: string | null;
};

export function isEmailVerified(user: UserLike | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}

export function verificationRequiredMessage(action: string) {
  return `Verify your email before ${action}.`;
}
