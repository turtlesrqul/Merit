import { describe, expect, it, vi } from "vitest";
import { recordProjectView } from "@/lib/db/projects";

describe("recordProjectView", () => {
  it("uses upsert with unique conflict keys for idempotency", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    const fakeClient = { from } as unknown as Parameters<typeof recordProjectView>[0];
    await recordProjectView(fakeClient, "viewer-1", "project-1");

    expect(from).toHaveBeenCalledWith("project_views");
    expect(upsert).toHaveBeenCalledWith(
      {
        project_id: "project-1",
        viewer_user_id: "viewer-1"
      },
      expect.objectContaining({
        onConflict: "project_id,viewer_user_id",
        ignoreDuplicates: true
      })
    );
  });

  it("throws when storage write fails", async () => {
    const upsert = vi.fn().mockResolvedValue({
      error: {
        message: "boom"
      }
    });
    const from = vi.fn().mockReturnValue({ upsert });

    const fakeClient = { from } as unknown as Parameters<typeof recordProjectView>[0];
    await expect(recordProjectView(fakeClient, "viewer-1", "project-1")).rejects.toThrow(
      "Failed to record project view: boom"
    );
  });
});
