"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claimPassportFromClient } from "@/app/claim/passport/[token]/actions";
import { Button } from "@/components/ui/button";

type ClaimPassportPanelProps = {
  initialErrorMessage?: string | null;
  token: string;
};

export function ClaimPassportPanel({ initialErrorMessage = null, token }: ClaimPassportPanelProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);
  const [isAlreadyClaimed, setIsAlreadyClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClaimPassport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isClaiming || isRedirecting) {
      return;
    }

    setErrorMessage(null);
    setIsAlreadyClaimed(false);
    setIsClaiming(true);

    const result = await claimPassportFromClient(token);

    if (result.status === "success" || result.status === "not_authenticated") {
      setIsRedirecting(true);
      router.push(result.redirectPath);
      router.refresh();
      return;
    }

    if (result.status === "already_claimed") {
      setIsAlreadyClaimed(true);
      setIsClaiming(false);
      router.refresh();
      return;
    }

    setErrorMessage(result.message);
    setIsClaiming(false);
  };

  if (isAlreadyClaimed) {
    return (
      <div className="space-y-4">
        <p className="label-caps">Claim link</p>
        <h2 className="font-serif text-2xl text-[#16130f]">This passport has already been claimed.</h2>
        <p className="text-sm leading-6 text-[#7b705f]">
          Check your dashboard or passport page to view it.
        </p>
        <Link href="/home">
          <Button>Go to dashboard</Button>
        </Link>
      </div>
    );
  }

  const buttonText = isClaiming || isRedirecting ? "Claiming..." : "Claim this Passport";

  return (
    <div className="space-y-4">
      <p className="label-caps">Ready to claim</p>
      <h2 className="font-serif text-2xl text-[#16130f]">Add this Passport to your Merit account</h2>
      {errorMessage ? (
        <p className="border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form onSubmit={handleClaimPassport}>
        <Button disabled={isClaiming || isRedirecting} type="submit">
          {buttonText}
        </Button>
      </form>
    </div>
  );
}
