import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ARTIFACT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_ARTIFACT_BUCKET ?? "project-artifacts";

export const runtime = "nodejs";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureArtifactBucket(
  adminClient: SupabaseClient,
  bucket: string
) {
  const { data: bucketData, error: getBucketError } = await adminClient.storage.getBucket(bucket);

  if (getBucketError) {
    const { error: createError } = await adminClient.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create storage bucket "${bucket}": ${createError.message}`);
    }
    return;
  }

  if (bucketData && !bucketData.public) {
    const { error: updateError } = await adminClient.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES
    });
    if (updateError) {
      throw new Error(`Failed to update storage bucket "${bucket}": ${updateError.message}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files were provided." }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to enable project file uploads."
        },
        { status: 500 }
      );
    }

    const { url } = getSupabaseEnv();
    const adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    await ensureArtifactBucket(adminClient, ARTIFACT_BUCKET);

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `${file.name} exceeds the 50MB limit.` },
          { status: 400 }
        );
      }

      const safeName = sanitizeFileName(file.name);
      const objectPath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await adminClient.storage
        .from(ARTIFACT_BUCKET)
        .upload(objectPath, file, {
          contentType: file.type || undefined,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: publicUrlData } = adminClient.storage
        .from(ARTIFACT_BUCKET)
        .getPublicUrl(objectPath);

      if (!publicUrlData.publicUrl) {
        throw new Error(`Failed to resolve public URL for ${file.name}.`);
      }

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed."
      },
      { status: 500 }
    );
  }
}
