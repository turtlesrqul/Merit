export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const stripWrappingQuotes = (value: string) => {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  };

  const normalizeSupabaseUrl = (value: string) => {
    const cleaned = stripWrappingQuotes(value);
    // Some deploy envs are set to ...supabase.co/rest/v1; Supabase client expects the project root URL.
    const withoutRestPath = cleaned.replace(/\/rest\/v1\/?$/i, "");
    return withoutRestPath.replace(/\/+$/g, "");
  };

  const normalizeKey = (value: string) => stripWrappingQuotes(value);

  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  const anonKey = rawAnonKey ? normalizeKey(rawAnonKey) : "";

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    );
  }

  return { url, anonKey };
}
