"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireVerifiedBrowserUser } from "@/lib/auth/browser-verified-user";
import { ActionIcon, IconButton, iconControlClassName } from "@/components/ui/action-icon";

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
      <Link
        aria-label="View project"
        className={iconControlClassName()}
        href={`/projects/${projectId}`}
        title="View project"
      >
        <ActionIcon name="eye" />
      </Link>
      <Link
        aria-label="Edit project"
        className={iconControlClassName()}
        href={`/projects/${projectId}/edit`}
        title="Edit project"
      >
        <ActionIcon name="pencil" />
      </Link>
      <IconButton disabled={isDeleting} icon="trash" label={isDeleting ? "Deleting project" : "Delete project"} onClick={handleDelete} variant="danger" />
      {errorMessage ? <p className="w-full text-sm text-red-700">{errorMessage}</p> : null}
    </>
  );
}
