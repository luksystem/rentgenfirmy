import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { EnsureTimesheetInput, TimesheetFilters, TimesheetStatus } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureTimesheetServer, fetchTimesheetsServer } from "@/lib/supabase/time-sheets-server";

function parseFilters(url: URL): TimesheetFilters {
  const filters: TimesheetFilters = {};
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");
  const periodType = url.searchParams.get("periodType");

  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (userId) filters.userId = userId;
  if (status) filters.status = status as TimesheetStatus;
  if (periodType === "week" || periodType === "month") {
    filters.periodType = periodType;
  }

  return filters;
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const url = new URL(request.url);
    const ensure = url.searchParams.get("ensure") === "1";
    const filters = parseFilters(url);

    if (ensure) {
      if (!filters.dateFrom || !filters.dateTo) {
        return NextResponse.json({ error: "Podaj zakres dat arkusza." }, { status: 400 });
      }

      const input: EnsureTimesheetInput = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        periodType: filters.periodType,
        userId: filters.userId,
      };
      const timesheet = await ensureTimesheetServer(admin, profile, input);
      return NextResponse.json({ timesheet });
    }

    const timesheets = await fetchTimesheetsServer(admin, profile, filters);
    return NextResponse.json({ timesheets });
  } catch (error) {
    return jsonError(error);
  }
}
