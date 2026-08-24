import { NextResponse } from "next/server";
import { getGHPAppointments } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { SEMINAR_SESSIONS } from "@/lib/ghpSchedule";
import { createGHPAttendanceSheet } from "@/lib/ghpAttendanceSheet";

export const runtime = "nodejs";

const safePart = (value) => String(value || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
  try {
    const seminarDate = request.nextUrl.searchParams.get("date") || "";
    const seminarTime = request.nextUrl.searchParams.get("session") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seminarDate) || !SEMINAR_SESSIONS.some((item) => item.id === seminarTime)) return NextResponse.json({ success: false, error: "Choose one seminar date and session." }, { status: 400 });
    const attendees = (await getGHPAppointments()).filter((item) => item.seminar_date === seminarDate && item.seminar_time === seminarTime && !["Cancelled", "Failed", "Not yet passed"].includes(item.status)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!attendees.length) return NextResponse.json({ success: false, error: "There are no attendees in this session." }, { status: 404 });
    const pdf = await createGHPAttendanceSheet({ seminarDate, seminarTime, attendees });
    return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="NMIS_GHP_Attendance_${safePart(seminarDate)}_${safePart(seminarTime)}.pdf"` } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to create attendance sheet." }, { status: 500 });
  }
}
