import OpenAI from "openai";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/runtime-config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ARTIFACT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_ARTIFACT_BUCKET ?? "project-artifacts";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_LENGTH = 900;

type PlaceholderImageRequest = {
  name?: unknown;
  projectType?: unknown;
  headline?: unknown;
  projectTitle?: unknown;
  projectOneLiner?: unknown;
  projectDescription?: unknown;
  projectNote?: unknown;
};

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

async function ensureArtifactBucket() {
  const adminClient = createAdminSupabaseClient();
  const { data: bucketData, error: getBucketError } = await adminClient.storage.getBucket(ARTIFACT_BUCKET);

  if (getBucketError) {
    const { error: createError } = await adminClient.storage.createBucket(ARTIFACT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create storage bucket "${ARTIFACT_BUCKET}": ${createError.message}`);
    }
    return;
  }

  if (bucketData && !bucketData.public) {
    const { error: updateError } = await adminClient.storage.updateBucket(ARTIFACT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES
    });
    if (updateError) {
      throw new Error(`Failed to update storage bucket "${ARTIFACT_BUCKET}": ${updateError.message}`);
    }
  }
}

async function requireAdminUser() {
  if (!getSupabaseEnvOrNull()) {
    return {
      response: NextResponse.json(
        { error: "Supabase is not configured yet for this environment." },
        { status: 503 }
      )
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (!isAdminEmail(user.email)) {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { user };
}

function isDesignHeadline(headline: string) {
  return /\b(design|visual|creative|media|fashion|interior|animation|art|ui|ux|branding)\b/i.test(headline);
}

function isItHeadline(headline: string) {
  return /\b(it|information technology|software|web|app|cyber|data|computer|programming|systems?)\b/i.test(headline);
}

function buildImagePrompt({
  headline,
  name,
  projectDescription,
  projectNote,
  projectOneLiner,
  projectType,
  projectTitle
}: {
  headline: string;
  name: string;
  projectDescription: string;
  projectNote: string;
  projectOneLiner: string;
  projectType: string;
  projectTitle: string;
}) {
  const explicitType = projectType.toLowerCase();
  const direction = explicitType.includes("website")
    ? "realistic website or landing page preview, browser-frame composition, clean product sections, responsive UI details, and portfolio-ready layout"
    : explicitType.includes("mobile")
      ? "mobile app screen mockups, product UI flows, phone-frame presentation, polished app interface, and portfolio case study cover"
      : explicitType.includes("dashboard") || explicitType.includes("data")
        ? "dashboard UI, analytics cards, charts, tables, data visualization, and product interface preview"
        : explicitType.includes("presentation") || explicitType.includes("deck")
          ? "presentation deck cover, slide thumbnails, editorial title slide, pitch deck layout, and polished document mockup"
          : explicitType.includes("poster") || explicitType.includes("visual") || explicitType.includes("branding")
            ? "poster design, campaign graphic, visual identity board, brand system mockup, or polished portfolio cover"
            : explicitType.includes("fashion") || explicitType.includes("moodboard") || explicitType.includes("photography")
              ? "fashion moodboard, photography contact sheet, media campaign board, editorial collage, or visual direction board"
              : isDesignHeadline(headline)
    ? "minimal poster design, branding mockup, editorial layout, UI/UX case study cover, product portfolio cover, or visual identity board"
    : isItHeadline(headline)
      ? "app interface mockup, website landing page preview, dashboard UI, data visualization, code/product concept cover, mobile app screen, or software project thumbnail"
      : "clean student portfolio project cover with a headline-appropriate concept";

  return [
    "Create one generic but high-quality student portfolio project cover image.",
    `Student name for context only, do not show a face or portrait: ${name}.`,
    headline
      ? `Passport headline for context: ${headline}.`
      : "Passport headline for context: not provided.",
    `Project type: ${projectType || "Auto / infer from headline and project description"}.`,
    `Project title: ${projectTitle || "Student portfolio project"}.`,
    projectOneLiner ? `Project one-liner: ${projectOneLiner}.` : "",
    projectDescription ? `Project description: ${projectDescription}.` : "",
    projectNote ? `Admin project note: ${projectNote}.` : "",
    `Visual direction: ${direction}.`,
    "Use a polished 16:9 composition suitable for a portfolio thumbnail.",
    "Do not include the student's face. Do not include school logos, copyrighted logos, celebrities, real company branding, fake client names, or readable brand marks.",
    "If text-like elements appear, keep them abstract or generic rather than claiming real awards, clients, grades, internships, companies, or achievements."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    if ("response" in admin) {
      return admin.response;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI image generation is not configured. Add OPENAI_API_KEY on the server." },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as PlaceholderImageRequest | null;
    const name = cleanText(body?.name, 120);
    const projectType = cleanText(body?.projectType, 120);
    const headline = cleanText(body?.headline, 180);
    const projectTitle = cleanText(body?.projectTitle, 160);
    const projectOneLiner = cleanText(body?.projectOneLiner, 220);
    const projectDescription = cleanText(body?.projectDescription, 900);
    const projectNote = cleanText(body?.projectNote, 900);

    if (!name) {
      return NextResponse.json({ error: "Student name is required." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const imageResponse = await client.images.generate({
      model: IMAGE_MODEL,
      prompt: buildImagePrompt({
        headline,
        name,
        projectDescription,
        projectNote,
        projectOneLiner,
        projectType,
        projectTitle
      }),
      n: 1,
      size: "1536x1024",
      quality: "low",
      output_format: "png"
    });

    const imageBase64 = imageResponse.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("OpenAI did not return image data.");
    }

    const imageBytes = Buffer.from(imageBase64, "base64");
    if (imageBytes.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("Generated image exceeds the storage upload limit.");
    }

    const adminClient = createAdminSupabaseClient();
    await ensureArtifactBucket();

    const fileName = `${sanitizeFileName(projectTitle || name || "placeholder-project") || "placeholder-project"}.png`;
    const objectPath = `claimable-passports/${admin.user.id}/generated/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${fileName}`;
    const imageFile = new File([imageBytes], fileName, { type: "image/png" });
    const { error: uploadError } = await adminClient.storage.from(ARTIFACT_BUCKET).upload(objectPath, imageFile, {
      contentType: "image/png",
      upsert: false
    });

    if (uploadError) {
      throw new Error(`Failed to save generated placeholder image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminClient.storage.from(ARTIFACT_BUCKET).getPublicUrl(objectPath);
    if (!publicUrlData.publicUrl) {
      throw new Error("Failed to resolve public URL for generated placeholder image.");
    }

    return NextResponse.json({
      imageUrl: publicUrlData.publicUrl,
      storagePath: objectPath
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate placeholder image." },
      { status: 500 }
    );
  }
}
