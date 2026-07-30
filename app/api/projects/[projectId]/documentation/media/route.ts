import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { fetchProjectDocumentationMedia } from "@/lib/supabase/project-documentation-media-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const items = await fetchProjectDocumentationMedia(projectId);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
