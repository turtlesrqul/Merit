"use client";

import { useState } from "react";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";
import { Button } from "@/components/ui/button";

type ProjectInteractionsProps = {
  projectId: string;
  initialSaved: boolean;
  initialInspired: boolean;
  display?: "default" | "icons";
};

export function ProjectInteractions({
  projectId,
  initialSaved,
  initialInspired,
  display = "default"
}: ProjectInteractionsProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isInspired, setIsInspired] = useState(initialInspired);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const withUserId = async () => {
    const { supabase, user } = await requireVerifiedBrowserUser("saving or liking projects");
    return { supabase, userId: user.id };
  };

  const toggleSaved = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { supabase, userId } = await withUserId();
      if (isSaved) {
        const { error } = await supabase
          .from("saved_projects")
          .delete()
          .eq("user_id", userId)
          .eq("project_id", projectId);
        if (error) {
          throw error;
        }
        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from("saved_projects")
          .insert({ user_id: userId, project_id: projectId });
        if (error) {
          throw error;
        }
        setIsSaved(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update saved state.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInspired = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { supabase, userId } = await withUserId();
      if (isInspired) {
        const { error } = await supabase
          .from("inspired_projects")
          .delete()
          .eq("user_id", userId)
          .eq("project_id", projectId);
        if (error) {
          throw error;
        }
        setIsInspired(false);
      } else {
        const { error } = await supabase
          .from("inspired_projects")
          .insert({ user_id: userId, project_id: projectId });
        if (error) {
          throw error;
        }
        setIsInspired(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update inspired state.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {display === "icons" ? (
        <div className="flex items-center gap-2">
          <button
            aria-label={isSaved ? "Unsave project" : "Save project"}
            className={`grid h-9 w-9 place-items-center rounded-full border transition ${
              isSaved
                ? "border-[#e4bb35] bg-[#f4cf59] text-[#171512]"
                : "border-[#ddd4c6] bg-[#fffdf9] text-[#4e4538] hover:border-[#e4bb35] hover:bg-[#fff3cf]"
            }`}
            disabled={isLoading}
            onClick={toggleSaved}
            type="button"
          >
            <svg aria-hidden="true" fill={isSaved ? "currentColor" : "none"} height="17" viewBox="0 0 24 24" width="17">
              <path d="M6 3.75h12a1 1 0 0 1 1 1v16.5l-7-4-7 4V4.75a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
          <button
            aria-label={isInspired ? "Unlike project" : "Like project"}
            className={`grid h-9 w-9 place-items-center rounded-full border transition ${
              isInspired
                ? "border-[#e4bb35] bg-[#f4cf59] text-[#171512]"
                : "border-[#ddd4c6] bg-[#fffdf9] text-[#4e4538] hover:border-[#e4bb35] hover:bg-[#fff3cf]"
            }`}
            disabled={isLoading}
            onClick={toggleInspired}
            type="button"
          >
            <svg aria-hidden="true" fill={isInspired ? "currentColor" : "none"} height="17" viewBox="0 0 24 24" width="17">
              <path d="M12 20.5s-7.5-4.4-9.2-9.1C1.5 7.5 4.1 4 8 4c2 0 3.2 1.1 4 2.3C12.8 5.1 14 4 16 4c3.9 0 6.5 3.5 5.2 7.4-1.7 4.7-9.2 9.1-9.2 9.1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <Button disabled={isLoading} onClick={toggleSaved} variant={isSaved ? "primary" : "secondary"}>
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            disabled={isLoading}
            onClick={toggleInspired}
            variant={isInspired ? "primary" : "secondary"}
          >
            {isInspired ? "Liked" : "Like"}
          </Button>
        </>
      )}
      {errorMessage ? <p className="w-full text-sm text-red-700">{errorMessage}</p> : null}
    </>
  );
}
