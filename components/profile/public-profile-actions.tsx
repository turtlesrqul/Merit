"use client";

import { useState } from "react";
import { ActionIcon, IconButton, iconControlClassName } from "@/components/ui/action-icon";

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
      <IconButton
        active={copied}
        icon={copied ? "check" : "share"}
        label={copied ? "Profile link copied" : "Share profile"}
        onClick={shareProfile}
      />
      {contactEmail ? (
        <a
          aria-label="Contact profile owner"
          className={iconControlClassName({ variant: "primary" })}
          href={`mailto:${contactEmail}`}
          title="Contact profile owner"
        >
          <ActionIcon name="mail" />
        </a>
      ) : null}
    </div>
  );
}
