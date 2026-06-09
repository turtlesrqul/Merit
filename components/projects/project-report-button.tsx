"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProjectReportButtonProps = {
  projectId: string;
};

export function ProjectReportButton({ projectId }: ProjectReportButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitReport = async () => {
    const reason = window.prompt(
      "Optional: why are you reporting this project? (e.g. spam, abuse, copyright)"
    );
    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: reason?.trim() || "community-report"
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        accepted?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit report.");
      }

      if (payload.accepted === false) {
        setMessage(payload.message ?? "Reporting is temporarily unavailable.");
        return;
      }

      setMessage("Report submitted. Thanks for helping keep Merit safe.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={isSubmitting} onClick={submitReport} variant="secondary">
        {isSubmitting ? "Submitting..." : "Report project"}
      </Button>
      {message ? <p className="text-xs text-ink-700">{message}</p> : null}
      {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
