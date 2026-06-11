"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { claimPassportForUser, normalizeRequiredText } from "@/lib/db/claimable-passports";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function claimPassportAction(formData: FormData) {
  const token = normalizeRequiredText(formData.get("token"), "Claim token");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/claim/passport/${token}`)}`);
  }

  const claimedPassport = await claimPassportForUser(token, user);
  const publicPassportPath = claimedPassport.passportSlug
    ? `/passport/${claimedPassport.passportSlug}`
    : `/c/${user.id}`;

  revalidatePath(`/claim/passport/${token}`);
  revalidatePath("/profile");
  revalidatePath(`/c/${user.id}`);
  revalidatePath(publicPassportPath);
  redirect(publicPassportPath);
}
