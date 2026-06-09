import { describe, expect, it } from "vitest";
import { buildPreparedArtifacts, validateVisualRequirements } from "@/lib/projects/form-validation";

describe("project form visual validation", () => {
  it("requires at least one artifact or cover image", () => {
    const message = validateVisualRequirements({
      preparedArtifacts: [],
      coverImageUrl: ""
    });
    expect(message).toContain("Add at least one artifact");
  });

  it("requires cover image when artifacts do not generate previews", () => {
    const message = validateVisualRequirements({
      preparedArtifacts: [
        {
          artifact_url: "https://files.example.com/model.step",
          artifact_type: "document",
          preview_url: null
        }
      ],
      coverImageUrl: ""
    });
    expect(message).toContain("do not generate a preview");
  });

  it("requires cover image fallback for website artifacts", () => {
    const preparedArtifacts = buildPreparedArtifacts("https://example.com/demo");
    const message = validateVisualRequirements({
      preparedArtifacts,
      coverImageUrl: ""
    });
    expect(message).toContain("add a cover image URL");
  });

  it("accepts valid visual setup for websites with cover fallback", () => {
    const preparedArtifacts = buildPreparedArtifacts("https://example.com/demo");
    const message = validateVisualRequirements({
      preparedArtifacts,
      coverImageUrl: "https://images.example.com/fallback.png"
    });
    expect(message).toBeNull();
  });
});
