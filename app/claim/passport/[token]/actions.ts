"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  claimPassportForUser,
  fetchClaimablePassportByToken,
  normalizeRequiredText
} from "@/lib/db/claimable-passports";
import { buildAuthPath } from "@/lib/auth/auth-urls";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClaimPassportClientResult =
  | {
      status: "success";
      redirectPath: string;
    }
  | {
      status: "not_authenticated";
      redirectPath: string;
    }
  | {
      status: "already_claimed";
      dashboardPath: string;
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function buildClaimPath(token: string) {
  return `/claim/passport/${encodeURIComponent(token)}`;
}

function isAlreadyClaimedError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("already claimed");
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

function buildClaimedPassportPath(passport: Awaited<ReturnType<typeof claimPassportForUser>>, ownerUserId: string) {
  return passport.passportSlug ? `/passport/${passport.passportSlug}` : `/c/${ownerUserId}`;
}

async function claimPassportForCurrentUser(tokenValue: FormDataEntryValue | string): Promise<ClaimPassportClientResult> {
  const token = normalizeRequiredText(tokenValue, "Claim token");
  const claimPath = buildClaimPath(token);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "not_authenticated",
      redirectPath: buildAuthPath("/sign-in", claimPath)
    };
  }

  let claimedPassport: Awaited<ReturnType<typeof claimPassportForUser>>;
  try {
    claimedPassport = await claimPassportForUser(token, user);
  } catch (error) {
    if (isAlreadyClaimedError(error)) {
      const lookup = await fetchClaimablePassportByToken(token);
      const redirectPath =
        lookup.state === "claimed" && lookup.passport?.ownerUserId === user.id
          ? lookup.passport.passportSlug
            ? `/passport/${lookup.passport.passportSlug}`
            : `/c/${user.id}`
          : "/home";

      return {
        status: "already_claimed",
        dashboardPath: redirectPath,
        message: "This passport has already been claimed. Check your dashboard or passport page to view it."
      };
    }

    return {
      status: "error",
      message: getSafeClaimErrorMessage(error)
    };
  }

  const publicPassportPath = buildClaimedPassportPath(claimedPassport, user.id);

  revalidatePath(claimPath);
  revalidatePath("/profile");
  revalidatePath(`/c/${user.id}`);
  revalidatePath(publicPassportPath);
  return {
    status: "success",
    redirectPath: publicPassportPath
  };
}

export async function claimPassportFromClient(token: string): Promise<ClaimPassportClientResult> {
  return claimPassportForCurrentUser(token);
}

export async function claimPassportAction(formData: FormData) {
  const token = normalizeRequiredText(formData.get("token"), "Claim token");
  const claimPath = buildClaimPath(token);
  const result = await claimPassportForCurrentUser(token);

  if (result.status === "success" || result.status === "not_authenticated") {
    redirect(result.redirectPath);
  }

  if (result.status === "already_claimed") {
    redirect(result.dashboardPath);
  }

  const params = new URLSearchParams({
    claim_error: result.message
  });
  redirect(`${claimPath}?${params.toString()}`);
}
