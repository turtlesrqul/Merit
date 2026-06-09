"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";
import { Button } from "@/components/ui/button";

type ProjectOwnerActionsProps = {
  projectId: string;
};

export function ProjectOwnerActions({ projectId }: ProjectOwnerActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const shouldDelete = window.confirm("Delete this project?");
    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      const { supabase } = await requireVerifiedBrowserUser("deleting projects");
      const { error } = await supabase.from("projects").delete().eq("project_id", projectId);
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete project.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Link href={`/projects/${projectId}`}>
        <Button variant="secondary">View</Button>
      </Link>
      <Link href={`/projects/${projectId}/edit`}>
        <Button variant="secondary">Edit</Button>
      </Link>
      <Button disabled={isDeleting} onClick={handleDelete} variant="danger">
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
      {errorMessage ? <p className="w-full text-sm text-red-700">{errorMessage}</p> : null}
    </>
  );
}
