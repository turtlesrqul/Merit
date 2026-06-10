import { notFound } from "next/navigation";
import PublicProfilePage from "@/app/c/[userId]/page";
import { fetchPublicCandidateDataByPassportSlug } from "@/lib/db/projects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicPassportSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const PASSPORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function PublicPassportSlugPage({ params }: PublicPassportSlugPageProps) {
  const { slug } = await params;
  if (!PASSPORT_SLUG_PATTERN.test(slug)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const candidate = await fetchPublicCandidateDataByPassportSlug(supabase, slug);
  if (!candidate) {
    notFound();
  }

  return PublicProfilePage({
    params: Promise.resolve({
      userId: candidate.userId
    })
  });
}
