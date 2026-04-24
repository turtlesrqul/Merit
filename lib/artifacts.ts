export type ArtifactType =
  | "website"
  | "image"
  | "video"
  | "document"
  | "figma"
  | "github"
  | "link";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|pptx?|xlsx?)(\?.*)?$/i;
const ENGINEERING_FILE_EXTENSIONS =
  /\.(dwg|dxf|step|stp|stl|iges|igs|ipt|iam|sldprt|sldasm|catpart|catproduct)(\?.*)?$/i;

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function normalizeArtifactUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol;
}

function extractYouTubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) {
    const value = url.pathname.replace("/", "").trim();
    return value || null;
  }

  if (url.hostname.includes("youtube.com")) {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) {
      return fromQuery;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const shortsIndex = parts.findIndex((part) => part === "shorts");
    if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
      return parts[shortsIndex + 1];
    }
  }

  return null;
}

export function detectArtifactType(urlValue: string): ArtifactType {
  const normalized = normalizeArtifactUrl(urlValue);
  if (!normalized) {
    return "link";
  }

  const url = safeParseUrl(normalized);
  const lower = normalized.toLowerCase();

  if (IMAGE_EXTENSIONS.test(lower)) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.test(lower)) {
    return "video";
  }
  if (DOCUMENT_EXTENSIONS.test(lower) || ENGINEERING_FILE_EXTENSIONS.test(lower)) {
    return "document";
  }
  if (!url) {
    return "link";
  }

  if (url.hostname.includes("figma.com")) {
    return "figma";
  }
  if (url.hostname.includes("github.com")) {
    return "github";
  }
  if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
    return "video";
  }
  if (url.hostname.includes("vimeo.com")) {
    return "video";
  }

  return "website";
}

export function buildArtifactPreviewUrl(
  urlValue: string,
  type: ArtifactType | string
): string | null {
  const normalized = normalizeArtifactUrl(urlValue);
  if (!normalized) {
    return null;
  }

  const url = safeParseUrl(normalized);

  if (type === "image") {
    return normalized;
  }

  if (type === "video" && url) {
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
  }

  if (type === "github" && url) {
    const repositoryPath = url.pathname.replace(/^\/+/, "");
    if (repositoryPath) {
      return `https://opengraph.githubassets.com/1/${repositoryPath}`;
    }
  }

  if (type === "figma") {
    return `https://www.figma.com/thumbnail?url=${encodeURIComponent(normalized)}`;
  }

  if (type === "document" && ENGINEERING_FILE_EXTENSIONS.test(normalized.toLowerCase())) {
    return null;
  }

  if (type === "website" || type === "document" || type === "link" || type === "video") {
    return `https://image.thum.io/get/width/1200/noanimate/${encodeURIComponent(normalized)}`;
  }

  return null;
}

export function getArtifactDisplayLabel(urlValue: string): string {
  const normalized = normalizeArtifactUrl(urlValue);
  const parsed = safeParseUrl(normalized);
  if (!parsed) {
    return urlValue;
  }
  return parsed.hostname.replace(/^www\./, "");
}
