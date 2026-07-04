import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  attachSignedUrlsToProtocolTemplates,
  createInspectionProtocolTemplate,
  listInspectionProtocolTemplates,
} from "@/lib/supabase/inspection-server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const templates = await listInspectionProtocolTemplates(clientId);
    const withUrls = await attachSignedUrlsToProtocolTemplates(templates);
    return NextResponse.json({ templates: withUrls });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const systemCode = String(formData.get("systemCode") ?? "").trim();
    const clientIdRaw = formData.get("clientId");
    const clientId =
      typeof clientIdRaw === "string" && clientIdRaw.trim() ? clientIdRaw.trim() : null;
    const file = formData.get("file");

    if (!name) {
      return NextResponse.json({ error: "Podaj nazwę wzoru protokołu." }, { status: 400 });
    }
    if (!systemCode) {
      return NextResponse.json({ error: "Wybierz system." }, { status: 400 });
    }

    const template = await createInspectionProtocolTemplate({
      clientId,
      systemCode,
      name,
      file: file instanceof File && file.size > 0 ? file : null,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się dodać wzoru." },
      { status: 400 },
    );
  }
}
