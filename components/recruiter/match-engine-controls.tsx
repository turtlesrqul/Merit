"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type MatchEngineControlsProps = {
  opportunityId?: string;
  compact?: boolean;
};

export function MatchEngineControls({ opportunityId, compact = false }: MatchEngineControlsProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runMatching = async () => {
    setIsRunning(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/matches/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(opportunityId ? { opportunityId } : {})
      });

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Failed to run match engine."
        );
      }

      if (opportunityId) {
        const count = typeof payload.matchedCandidates === "number" ? payload.matchedCandidates : 0;
        setMessage(`Generated ${count} candidate match${count === 1 ? "" : "es"} for this role.`);
      } else {
        const opportunitiesProcessed =
          typeof payload.opportunitiesProcessed === "number" ? payload.opportunitiesProcessed : 0;
        const totalMatches = typeof payload.totalMatches === "number" ? payload.totalMatches : 0;
        setMessage(
          `Processed ${opportunitiesProcessed} role${opportunitiesProcessed === 1 ? "" : "s"} and created ${totalMatches} total match${totalMatches === 1 ? "" : "es"}.`
        );
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run match engine.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <Button
        className={compact ? "" : "w-full"}
        disabled={isRunning}
        onClick={runMatching}
        variant={compact ? "secondary" : "primary"}
      >
        {isRunning ? "Running..." : compact ? "Refresh matches" : "Run match engine"}
      </Button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
