import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/runtime-config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnvOrNull } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const ARTIFACT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_ARTIFACT_BUCKET ?? "project-artifacts";

export const runtime = "nodejs";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureArtifactBucket() {
  const adminClient = createAdminSupabaseClient();
  const { data: bucketData, error: getBucketError } = await adminClient.storage.getBucket(ARTIFACT_BUCKET);

  if (getBucketError) {
    const { error: createError } = await adminClient.storage.createBucket(ARTIFACT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_UPLOAD_BYTES
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create storage bucket "${ARTIFACT_BUCKET}": ${createError.message}`);
    }
    return;
  }

  if (bucketData && !bucketData.public) {
    const { error: updateError } = await adminClient.storage.updateBucket(ARTIFACT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_UPLOAD_BYTES
    });
    if (updateError) {
      throw new Error(`Failed to update storage bucket "${ARTIFACT_BUCKET}": ${updateError.message}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    if (!getSupabaseEnvOrNull()) {
      return NextResponse.json(
        { error: "Supabase is not configured yet for this environment." },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Project image must be an image file." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ error: `${file.name} exceeds the 10MB image limit.` }, { status: 400 });
    }

    const adminClient = createAdminSupabaseClient();
    await ensureArtifactBucket();

    const safeName = sanitizeFileName(file.name);
    const objectPath = `claimable-passports/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error: uploadError } = await adminClient.storage.from(ARTIFACT_BUCKET).upload(objectPath, file, {
      contentType: file.type || undefined,
      upsert: false
    });

    if (uploadError) {
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminClient.storage.from(ARTIFACT_BUCKET).getPublicUrl(objectPath);
    if (!publicUrlData.publicUrl) {
      throw new Error(`Failed to resolve public URL for ${file.name}.`);
    }

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Project image upload failed." },
      { status: 500 }
    );
  }
}
