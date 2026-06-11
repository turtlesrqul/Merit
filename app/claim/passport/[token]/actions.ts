"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { claimPassportForUser, normalizeRequiredText } from "@/lib/db/claimable-passports";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function buildClaimPath(token: string) {
  return `/claim/passport/${encodeURIComponent(token)}`;
}

function getSafeClaimErrorMessage(error: unknown) {
  const fallbackMessage = "We could not claim this Passport yet. Please try again or contact Merit support.";

  if (!(error instanceof Error) || !error.message) {
    console.error("Claim Passport failed", error);
    return fallbackMessage;
  }

  const expectedClaimStates = [
    "not available anymore",
    "already claimed",
    "already owned",
    "expired",
    "path is already taken"
  ];

  if (expectedClaimStates.some((stateMessage) => error.message.includes(stateMessage))) {
    return error.message;
  }

  console.error("Claim Passport failed", error);
  return fallbackMessage;
}

export async function claimPassportAction(formData: FormData) {
  const token = normalizeRequiredText(formData.get("token"), "Claim token");
  const claimPath = buildClaimPath(token);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(claimPath)}`);
  }

  let claimedPassport: Awaited<ReturnType<typeof claimPassportForUser>>;
  try {
    claimedPassport = await claimPassportForUser(token, user);
  } catch (error) {
    const params = new URLSearchParams({
      claim_error: getSafeClaimErrorMessage(error)
    });
    redirect(`${claimPath}?${params.toString()}`);
  }

  const publicPassportPath = claimedPassport.passportSlug
    ? `/passport/${claimedPassport.passportSlug}`
    : `/c/${user.id}`;

  revalidatePath(claimPath);
  revalidatePath("/profile");
  revalidatePath(`/c/${user.id}`);
  revalidatePath(publicPassportPath);
  redirect(publicPassportPath);
}
