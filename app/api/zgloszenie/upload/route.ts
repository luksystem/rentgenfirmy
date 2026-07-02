import { NextResponse } from "next/server";
import { readIntakeVerifiedToken } from "@/lib/service-intake/tokens";
import { uploadServiceIntakeAttachment } from "@/lib/supabase/service-intake-attachments-repository";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const verificationToken = String(formData.get("verificationToken") ?? "").trim();
    const file = formData.get("file");

    if (!verificationToken || !readIntakeVerifiedToken(verificationToken)) {
      return NextResponse.json({ error: "Sesja wygasła. Odśwież stronę." }, { status: 401 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Wybierz plik do przesłania." }, { status: 400 });
    }

    const attachment = await uploadServiceIntakeAttachment({ verificationToken, file });
    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się przesłać pliku." },
      { status: 400 },
    );
  }
}
