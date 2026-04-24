"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

type ProjectInteractionsProps = {
  projectId: string;
  initialSaved: boolean;
  initialInspired: boolean;
};

export function ProjectInteractions({
  projectId,
  initialSaved,
  initialInspired
}: ProjectInteractionsProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isInspired, setIsInspired] = useState(initialInspired);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const withUserId = async () => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sign in to save or mark inspiration.");
    }
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
      <Button disabled={isLoading} onClick={toggleSaved} variant={isSaved ? "primary" : "secondary"}>
        {isSaved ? "Saved" : "Save"}
      </Button>
      <Button
        disabled={isLoading}
        onClick={toggleInspired}
        variant={isInspired ? "primary" : "secondary"}
      >
        {isInspired ? "Inspired" : "Inspired by this"}
      </Button>
      {errorMessage ? <p className="w-full text-sm text-red-700">{errorMessage}</p> : null}
    </>
  );
}
