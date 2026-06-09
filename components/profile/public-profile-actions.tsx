"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PublicProfileActionsProps = {
  contactEmail: string | null;
  profileName: string;
};

export function PublicProfileActions({ contactEmail, profileName }: PublicProfileActionsProps) {
  const [copied, setCopied] = useState(false);

  const shareProfile = async () => {
    const url = window.location.href;
    const title = `${profileName} on Merit`;

    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={shareProfile} type="button" variant="secondary">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <rect height="9" rx="1" stroke="currentColor" strokeWidth="1.8" width="9" x="9" y="9" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {copied ? "Copied" : "Share profile"}
      </Button>
      {contactEmail ? (
        <a href={`mailto:${contactEmail}`}>
          <Button>
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <rect height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Contact
          </Button>
        </a>
      ) : null}
    </div>
  );
}
