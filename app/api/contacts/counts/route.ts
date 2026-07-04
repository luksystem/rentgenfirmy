import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { countUnhandledContactsServer } from "@/lib/supabase/contact-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unhandledCount = await countUnhandledContactsServer();
    return NextResponse.json({ unhandledCount, newCount: unhandledCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}
