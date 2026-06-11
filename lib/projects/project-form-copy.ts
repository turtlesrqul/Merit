import type { ProjectType } from "@/lib/artifacts";

export function projectTypeLabel(type: ProjectType) {
  if (type === "web") return "Web App / Website";
  if (type === "design") return "Design / Visual";
  if (type === "document") return "Deck / Document";
  return "Other";
}

export function artifactPlaceholder(projectType: ProjectType) {
  if (projectType === "web") {
    return "https://your-app.com\nhttps://github.com/you/project";
  }
  if (projectType === "design") {
    return "https://images.example.com/mockup.png\nhttps://www.figma.com/file/...";
  }
  if (projectType === "document") {
    return "https://files.example.com/case-study.pdf\nhttps://files.example.com/pitch-deck.pptx";
  }
  return "https://example.com/project-demo\nhttps://files.example.com/model.glb";
}

export function artifactTips(projectType: ProjectType) {
  if (projectType === "web") {
    return [
      "Add the live app URL so users can open and test it directly on Merit.",
      "Some websites block iframe embeds; add a cover image for a guaranteed clean fallback."
    ];
  }
  if (projectType === "design") {
    return [
      "Upload images for full-screen zoom viewing on Merit.",
      "Figma links are supported, but include at least one image as visual backup."
    ];
  }
  if (projectType === "document") {
    return [
      "PDFs render best in Merit's in-app viewer.",
      "PPTX/DOCX/XLSX can be viewed, but converting key decks to PDF gives the most consistent experience."
    ];
  }
  return [
    "For 3D projects, upload GLB, GLTF, STL, or OBJ for interactive in-app viewing.",
    "For CAD-native formats that cannot render in browser, include a cover image."
  ];
}
