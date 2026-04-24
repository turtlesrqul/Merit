import { describe, expect, it } from "vitest";
import { buildArtifactPreviewUrl, detectArtifactType, normalizeArtifactUrl } from "@/lib/artifacts";

describe("artifact helpers", () => {
  it("normalizes links by adding protocol", () => {
    expect(normalizeArtifactUrl("example.com")).toBe("https://example.com");
  });

  it("detects common artifact types", () => {
    expect(detectArtifactType("https://github.com/openai/openai-node")).toBe("github");
    expect(detectArtifactType("https://www.figma.com/file/abc")).toBe("figma");
    expect(detectArtifactType("https://site.com/image.png")).toBe("image");
    expect(detectArtifactType("https://site.com/page")).toBe("website");
  });

  it("returns youtube thumbnail for youtube videos", () => {
    const preview = buildArtifactPreviewUrl("https://youtu.be/dQw4w9WgXcQ", "video");
    expect(preview).toContain("img.youtube.com");
  });
});
