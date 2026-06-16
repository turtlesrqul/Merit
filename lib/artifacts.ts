export type ArtifactType =
  | "website"
  | "image"
  | "video"
  | "document"
  | "model3d"
  | "figma"
  | "github"
  | "link";

export type ProjectType = "web" | "design" | "document" | "other";

type ProjectArtifactPreviewInput = {
  url: string;
  type: string;
  previewUrl: string | null;
  label?: string;
};

export type ResolvedProjectVisual = {
  previewUrl: string | null;
  livePreviewUrl: string | null;
  source: "live" | "artifact" | "cover" | "fallback";
};

export type ArtifactViewerKind =
  | "website"
  | "image"
  | "video"
  | "pdf"
  | "office"
  | "model3d"
  | "unsupported";

export type ResolvedArtifactViewer = {
  kind: ArtifactViewerKind;
  directUrl: string;
  embedUrl: string | null;
  supportsFullscreen: boolean;
  reason: string | null;
};

export type ProjectViewerSource = {
  kind: ArtifactViewerKind;
  embedUrl: string | null;
  directUrl: string | null;
  previewUrl: string | null;
  source: "artifact" | "cover" | "fallback";
  supportsFullscreen: boolean;
  reason: string | null;
};

export type ProjectImageGalleryItem = {
  url: string;
  label: string;
  source: "cover" | "artifact";
};

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|pptx?|xlsx?)(\?.*)?$/i;
const PDF_EXTENSION = /\.pdf(\?.*)?$/i;
const OFFICE_DOCUMENT_EXTENSIONS = /\.(docx?|pptx?|xlsx?)(\?.*)?$/i;
const MODEL3D_EXTENSIONS = /\.(glb|gltf|stl|obj)(\?.*)?$/i;
const ENGINEERING_FILE_EXTENSIONS =
  /\.(dwg|dxf|step|stp|iges|igs|ipt|iam|sldprt|sldasm|catpart|catproduct)(\?.*)?$/i;

const VIEWER_PRIORITY: Record<ProjectType, Record<Exclude<ArtifactViewerKind, "unsupported">, number>> = {
  web: {
    website: 100,
    video: 85,
    image: 80,
    pdf: 70,
    office: 65,
    model3d: 60
  },
  design: {
    image: 100,
    model3d: 95,
    video: 90,
    website: 75,
    pdf: 70,
    office: 65
  },
  document: {
    pdf: 100,
    office: 95,
    image: 80,
    website: 70,
    video: 60,
    model3d: 50
  },
  other: {
    model3d: 100,
    image: 90,
    website: 80,
    video: 75,
    pdf: 70,
    office: 65
  }
};

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

function extractVimeoId(url: URL): string | null {
  if (!url.hostname.includes("vimeo.com")) {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const maybeId = parts[parts.length - 1];
  return maybeId && /^\d+$/.test(maybeId) ? maybeId : null;
}

function buildYouTubeEmbedUrl(url: URL): string | null {
  const youtubeId = extractYouTubeId(url);
  if (!youtubeId) {
    return null;
  }
  return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}

function buildVimeoEmbedUrl(url: URL): string | null {
  const vimeoId = extractVimeoId(url);
  if (!vimeoId) {
    return null;
  }
  return `https://player.vimeo.com/video/${vimeoId}`;
}

function buildOfficeEmbedUrl(urlValue: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlValue)}`;
}

function isOfficeDocumentUrl(urlValue: string) {
  return OFFICE_DOCUMENT_EXTENSIONS.test(urlValue.toLowerCase());
}

function isPdfDocumentUrl(urlValue: string) {
  return PDF_EXTENSION.test(urlValue.toLowerCase());
}

function isModel3DUrl(urlValue: string) {
  return MODEL3D_EXTENSIONS.test(urlValue.toLowerCase());
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
  if (MODEL3D_EXTENSIONS.test(lower)) {
    return "model3d";
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

  if (type === "model3d") {
    return null;
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

function hasHttpProtocol(value: string) {
  return /^https?:\/\//i.test(value);
}

function canBeLivePreviewUrl(urlValue: string, type: string) {
  if (!hasHttpProtocol(urlValue)) {
    return false;
  }
  const normalizedType = type.toLowerCase();
  if (normalizedType !== "website") {
    return false;
  }
  const normalizedUrl = normalizeArtifactUrl(urlValue).toLowerCase();
  if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) {
    return false;
  }
  return true;
}

export function resolveArtifactViewer(urlValue: string, artifactType: string): ResolvedArtifactViewer {
  const normalized = normalizeArtifactUrl(urlValue);
  if (!normalized) {
    return {
      kind: "unsupported",
      directUrl: "",
      embedUrl: null,
      supportsFullscreen: false,
      reason: "Missing URL."
    };
  }

  const parsed = safeParseUrl(normalized);
  const normalizedType = artifactType.toLowerCase();
  const lowerUrl = normalized.toLowerCase();

  const unsupportedEngineeringMessage =
    "This CAD file cannot render in-browser yet. Upload GLB/GLTF/STL/OBJ or add a visual cover.";

  if (normalizedType === "image" || IMAGE_EXTENSIONS.test(lowerUrl)) {
    return {
      kind: "image",
      directUrl: normalized,
      embedUrl: normalized,
      supportsFullscreen: true,
      reason: null
    };
  }

  if (normalizedType === "model3d" || isModel3DUrl(lowerUrl)) {
    return {
      kind: "model3d",
      directUrl: normalized,
      embedUrl: normalized,
      supportsFullscreen: true,
      reason: null
    };
  }

  if (normalizedType === "video" || VIDEO_EXTENSIONS.test(lowerUrl)) {
    if (parsed) {
      const youtubeEmbed = buildYouTubeEmbedUrl(parsed);
      if (youtubeEmbed) {
        return {
          kind: "video",
          directUrl: normalized,
          embedUrl: youtubeEmbed,
          supportsFullscreen: true,
          reason: null
        };
      }
      const vimeoEmbed = buildVimeoEmbedUrl(parsed);
      if (vimeoEmbed) {
        return {
          kind: "video",
          directUrl: normalized,
          embedUrl: vimeoEmbed,
          supportsFullscreen: true,
          reason: null
        };
      }
    }

    return {
      kind: "video",
      directUrl: normalized,
      embedUrl: normalized,
      supportsFullscreen: true,
      reason: null
    };
  }

  if (normalizedType === "document" || DOCUMENT_EXTENSIONS.test(lowerUrl)) {
    if (isPdfDocumentUrl(lowerUrl)) {
      return {
        kind: "pdf",
        directUrl: normalized,
        embedUrl: normalized,
        supportsFullscreen: true,
        reason: null
      };
    }

    if (isOfficeDocumentUrl(lowerUrl)) {
      return {
        kind: "office",
        directUrl: normalized,
        embedUrl: buildOfficeEmbedUrl(normalized),
        supportsFullscreen: true,
        reason: null
      };
    }
  }

  if (ENGINEERING_FILE_EXTENSIONS.test(lowerUrl)) {
    return {
      kind: "unsupported",
      directUrl: normalized,
      embedUrl: null,
      supportsFullscreen: false,
      reason: unsupportedEngineeringMessage
    };
  }

  if (!parsed) {
    return {
      kind: "unsupported",
      directUrl: normalized,
      embedUrl: null,
      supportsFullscreen: false,
      reason: "Only HTTP/HTTPS links are supported in the in-app viewer."
    };
  }

  if (
    normalizedType === "website" ||
    normalizedType === "figma" ||
    normalizedType === "github" ||
    normalizedType === "link"
  ) {
    return {
      kind: "website",
      directUrl: normalized,
      embedUrl: normalized,
      supportsFullscreen: true,
      reason: null
    };
  }

  return {
    kind: "website",
    directUrl: normalized,
    embedUrl: normalized,
    supportsFullscreen: true,
    reason: null
  };
}

export function resolveProjectViewerSource({
  artifacts,
  coverImageUrl,
  projectType
}: {
  artifacts: ProjectArtifactPreviewInput[];
  coverImageUrl: string | null;
  projectType: ProjectType;
}): ProjectViewerSource {
  const candidates = artifacts
    .map((artifact, index) => {
      const resolved = resolveArtifactViewer(artifact.url, artifact.type);
      if (resolved.kind === "unsupported" || !resolved.embedUrl) {
        return null;
      }
      return {
        index,
        resolved,
        previewUrl: artifact.previewUrl
      };
    })
    .filter(
      (
        entry
      ): entry is {
        index: number;
        resolved: ResolvedArtifactViewer;
        previewUrl: string | null;
      } => Boolean(entry)
    );

  if (candidates.length > 0) {
    const ranked = [...candidates].sort((a, b) => {
      const aScore = VIEWER_PRIORITY[projectType][a.resolved.kind as Exclude<ArtifactViewerKind, "unsupported">] ?? 0;
      const bScore = VIEWER_PRIORITY[projectType][b.resolved.kind as Exclude<ArtifactViewerKind, "unsupported">] ?? 0;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      return a.index - b.index;
    });
    const winner = ranked[0];
    return {
      kind: winner.resolved.kind,
      embedUrl: winner.resolved.embedUrl,
      directUrl: winner.resolved.directUrl,
      previewUrl: winner.previewUrl,
      source: "artifact",
      supportsFullscreen: winner.resolved.supportsFullscreen,
      reason: winner.resolved.reason
    };
  }

  if (typeof coverImageUrl === "string" && coverImageUrl.trim().length > 0) {
    const normalizedCover = coverImageUrl.trim();
    return {
      kind: "image",
      embedUrl: normalizedCover,
      directUrl: normalizedCover,
      previewUrl: normalizedCover,
      source: "cover",
      supportsFullscreen: true,
      reason: null
    };
  }

  return {
    kind: "unsupported",
    embedUrl: null,
    directUrl: null,
    previewUrl: null,
    source: "fallback",
    supportsFullscreen: false,
    reason: "No in-app-viewable artifact was found yet."
  };
}

export function resolveProjectVisualPreview({
  artifacts,
  coverImageUrl,
  projectType
}: {
  artifacts: ProjectArtifactPreviewInput[];
  coverImageUrl: string | null;
  projectType: ProjectType;
}): ResolvedProjectVisual {
  const firstLiveArtifact = projectType === "web"
    ? artifacts.find((artifact) => canBeLivePreviewUrl(artifact.url, artifact.type))
    : undefined;

  if (typeof coverImageUrl === "string" && coverImageUrl.trim().length > 0) {
    return {
      livePreviewUrl: firstLiveArtifact?.url ?? null,
      previewUrl: coverImageUrl.trim(),
      source: "cover"
    };
  }

  const firstArtifactWithPreview = artifacts.find(
    (artifact) => typeof artifact.previewUrl === "string" && artifact.previewUrl.trim().length > 0
  );

  if (firstLiveArtifact && firstArtifactWithPreview?.previewUrl) {
    return {
      livePreviewUrl: firstLiveArtifact.url,
      previewUrl: firstArtifactWithPreview.previewUrl,
      source: "live"
    };
  }

  if (firstArtifactWithPreview?.previewUrl) {
    return {
      livePreviewUrl: null,
      previewUrl: firstArtifactWithPreview.previewUrl,
      source: "artifact"
    };
  }

  return {
    livePreviewUrl: null,
    previewUrl: null,
    source: "fallback"
  };
}

export function resolveProjectImageGallery({
  artifacts,
  coverImageUrl
}: {
  artifacts: ProjectArtifactPreviewInput[];
  coverImageUrl: string | null;
}): ProjectImageGalleryItem[] {
  const images: ProjectImageGalleryItem[] = [];
  const seenUrls = new Set<string>();

  const addImage = (urlValue: string | null | undefined, label: string, source: "cover" | "artifact") => {
    const normalized = typeof urlValue === "string" ? urlValue.trim() : "";
    if (!normalized || seenUrls.has(normalized)) {
      return;
    }
    seenUrls.add(normalized);
    images.push({ label, source, url: normalized });
  };

  addImage(coverImageUrl, "Cover image", "cover");

  artifacts.forEach((artifact, index) => {
    const viewer = resolveArtifactViewer(artifact.url, artifact.type);
    if (viewer.kind !== "image" || !viewer.embedUrl) {
      return;
    }
    addImage(artifact.previewUrl ?? viewer.embedUrl, artifact.label ?? `Image ${index + 1}`, "artifact");
  });

  return images;
}

export function hasAnyVisualPreview({
  artifacts,
  coverImageUrl
}: {
  artifacts: ProjectArtifactPreviewInput[];
  coverImageUrl: string | null;
}) {
  if (typeof coverImageUrl === "string" && coverImageUrl.trim().length > 0) {
    return true;
  }

  return artifacts.some(
    (artifact) => typeof artifact.previewUrl === "string" && artifact.previewUrl.trim().length > 0
  );
}
