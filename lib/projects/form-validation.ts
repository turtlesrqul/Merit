import {
  buildArtifactPreviewUrl,
  detectArtifactType,
  normalizeArtifactUrl,
  type ProjectType
} from "@/lib/artifacts";

export type PreparedArtifact = {
  artifact_url: string;
  artifact_type: string;
  preview_url: string | null;
};

export function parseCommaSeparatedSkills(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function parseLineSeparatedLinks(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeProjectType(value: string): ProjectType {
  if (value === "web" || value === "design" || value === "document" || value === "other") {
    return value;
  }
  return "other";
}

export function categoryForProjectType(projectType: ProjectType) {
  if (projectType === "web") return "Web App / Website";
  if (projectType === "design") return "Design / Visual";
  if (projectType === "document") return "Deck / Document";
  return "Other";
}

export function buildPreparedArtifacts(artifactLinks: string): PreparedArtifact[] {
  const normalizedArtifacts = Array.from(new Set(parseLineSeparatedLinks(artifactLinks))).map(
    normalizeArtifactUrl
  );

  return normalizedArtifacts
    .filter(Boolean)
    .map((artifactUrl) => {
      const artifactType = detectArtifactType(artifactUrl);
      return {
        artifact_url: artifactUrl,
        artifact_type: artifactType,
        preview_url: buildArtifactPreviewUrl(artifactUrl, artifactType)
      };
    });
}

export function validateVisualRequirements({
  preparedArtifacts,
  coverImageUrl
}: {
  preparedArtifacts: PreparedArtifact[];
  coverImageUrl: string;
}) {
  const normalizedCoverImage = normalizeArtifactUrl(coverImageUrl);
  const hasCoverImage = normalizedCoverImage.length > 0;
  const hasArtifact = preparedArtifacts.length > 0;
  const hasPreviewableArtifact = preparedArtifacts.some(
    (artifact) => typeof artifact.preview_url === "string" && artifact.preview_url.trim().length > 0
  );
  const hasWebsiteArtifact = preparedArtifacts.some(
    (artifact) => artifact.artifact_type.toLowerCase() === "website"
  );

  if (!hasArtifact && !hasCoverImage) {
    return "Add at least one artifact or a cover image before publishing.";
  }

  if (!hasPreviewableArtifact && !hasCoverImage) {
    return "Your artifacts do not generate a preview. Add a cover image so the project card always has a visual.";
  }
  if (hasWebsiteArtifact && !hasCoverImage) {
    return "For web projects, add a cover image URL so your card has a reliable thumbnail if embeds are blocked.";
  }

  return null;
}
