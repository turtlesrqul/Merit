"use client";

import { useState } from "react";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/action-icon";

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
  display = "icons"
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
          <IconButton
            active={isSaved}
            disabled={isLoading}
            icon="bookmark"
            label={isSaved ? "Unsave project" : "Save project"}
            onClick={toggleSaved}
          />
          <IconButton
            active={isInspired}
            disabled={isLoading}
            icon="heart"
            label={isInspired ? "Unlike project" : "Like project"}
            onClick={toggleInspired}
          />
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
