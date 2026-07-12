import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { CreateTimeEntryInput, TimeEntryFilters, TimeEntryStatus } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createTimeEntryServer,
  fetchTimeEntriesServer,
} from "@/lib/supabase/time-tracking-server";

function parseFilters(url: URL): TimeEntryFilters {
  const filters: TimeEntryFilters = {};
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const userId = url.searchParams.get("userId");
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");

  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (userId) filters.userId = userId;
  if (projectId) filters.projectId = projectId;
  if (status) filters.status = status as TimeEntryStatus;

  return filters;
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const entries = await fetchTimeEntriesServer(admin, profile, parseFilters(new URL(request.url)));
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as CreateTimeEntryInput;

    if (!body.date) {
      return NextResponse.json({ error: "Data pracy jest wymagana." }, { status: 400 });
    }
    if (!body.categoryId || !body.entryTypeId) {
      return NextResponse.json({ error: "Wybierz kategorię i typ wpisu." }, { status: 400 });
    }
    if (!body.durationMinutes || body.durationMinutes <= 0) {
      return NextResponse.json({ error: "Podaj czas większy od zera." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const entry = await createTimeEntryServer(admin, profile, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}
