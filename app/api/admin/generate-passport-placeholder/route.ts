import OpenAI from "openai";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/runtime-config";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TEXT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const MAX_TEXT_LENGTH = 800;
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;

type PlaceholderRequest = {
  name?: unknown;
  email?: unknown;
  headline?: unknown;
  publicPath?: unknown;
  projectType?: unknown;
  projectNote?: unknown;
  projectImageUrl?: unknown;
  projectImageBase64?: unknown;
};

type PassportPlaceholder = {
  bio: string;
  skills: string[];
  projectTitle: string;
  projectOneLiner: string;
  projectDescription: string;
};

const placeholderSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "bio",
    "skills",
    "projectTitle",
    "projectOneLiner",
    "projectDescription"
  ],
  properties: {
    bio: { type: "string" },
    skills: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: { type: "string" }
    },
    projectTitle: { type: "string" },
    projectOneLiner: { type: "string" },
    projectDescription: { type: "string" }
  }
} as const;

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultilineText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function cleanHttpUrl(value: unknown) {
  const raw = cleanText(value, 2048);
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function cleanImageDataUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("data:image/") ||
    !trimmed.includes(";base64,") ||
    trimmed.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return "";
  }
  return trimmed;
}

function isPassportPlaceholder(value: unknown): value is PassportPlaceholder {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.bio === "string" &&
    Array.isArray(record.skills) &&
    record.skills.every((skill) => typeof skill === "string") &&
    record.skills.length >= 5 &&
    record.skills.length <= 8 &&
    typeof record.projectTitle === "string" &&
    typeof record.projectOneLiner === "string" &&
    typeof record.projectDescription === "string"
  );
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

function buildPrompt({
  headline,
  name,
  projectType,
  projectImageUrl,
  projectNote,
  publicPath
}: {
  headline: string;
  name: string;
  projectType: string;
  projectImageUrl: string;
  projectNote: string;
  publicPath: string;
}) {
  return [
    `Student name: ${name}`,
    headline
      ? `Passport headline: ${headline}`
      : "Passport headline: not provided. Infer broad context from the project type, note, or image only.",
    `Project type: ${projectType || "Auto / infer from note, image, or headline"}`,
    publicPath ? `Public passport path: /passport/${publicPath}` : "Public passport path: not provided",
    projectNote ? `Optional project note: ${projectNote}` : "Optional project note: none provided",
    projectImageUrl
      ? "A project image or thumbnail is attached. Use it as light visual context without inventing specific claims."
      : "No project image was provided. Create a generic headline- and project-type-appropriate student project concept."
  ].join("\n");
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
        { error: "AI generation is not configured. Add OPENAI_API_KEY on the server." },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as PlaceholderRequest | null;
    const name = cleanText(body?.name, 120);
    const email = cleanText(body?.email, 254);
    const headline = cleanText(body?.headline, 180);
    const publicPath = cleanText(body?.publicPath, 120);
    const projectType = cleanText(body?.projectType, 120);
    const projectNote = cleanMultilineText(body?.projectNote, 1000);
    const projectImageUrl = cleanHttpUrl(body?.projectImageUrl);
    const projectImageBase64 = cleanImageDataUrl(body?.projectImageBase64);
    const imageInputUrl = projectImageUrl || projectImageBase64;

    if (!name) {
      return NextResponse.json({ error: "Student name is required." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: buildPrompt({
          headline,
          name,
          projectType,
          projectImageUrl: imageInputUrl,
          projectNote,
          publicPath
        })
      }
    ];

    if (imageInputUrl) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageInputUrl,
          detail: "low"
        }
      });
    }

    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            `You generate editable placeholder content for pre-claim student portfolio passports. Write polished, professional, believable student profile copy. Do not invent specific real-world achievements, clients, awards, internships, companies, grades, years of experience, or personal history. Use the provided name, headline, project type, optional project note, and optional project image as context. The headline may contain course, school, discipline, or positioning information. If a specific project type is provided, strongly match the generated project title, one-liner, description, and skills to that type. If project type is Auto, infer from the image/note first and headline second. Never include the student's email in generated public copy. Return only valid JSON matching the schema.${email ? " The email was supplied for admin validation only and must not appear in the output." : ""}`
        },
        {
          role: "user",
          content: userContent
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "passport_placeholder",
          description: "Editable placeholder copy for a student pre-claim passport.",
          schema: placeholderSchema,
          strict: true
        }
      }
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("OpenAI returned an empty placeholder response.");
    }

    const parsed = JSON.parse(rawContent) as unknown;
    if (!isPassportPlaceholder(parsed)) {
      throw new Error("OpenAI returned placeholder content in an unexpected shape.");
    }

    return NextResponse.json({
      bio: parsed.bio.trim(),
      skills: parsed.skills.map((skill) => skill.trim()).filter(Boolean).slice(0, 8),
      projectTitle: parsed.projectTitle.trim(),
      projectOneLiner: parsed.projectOneLiner.trim(),
      projectDescription: parsed.projectDescription.trim()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate placeholder content." },
      { status: 500 }
    );
  }
}
