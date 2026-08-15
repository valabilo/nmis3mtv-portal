import { NextResponse } from "next/server";
import { getGHPAppointments, getGHPManualEntries, markGHPManualEntryNotified, updateGHPAppointment } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { sendGHPExamResult } from "@/lib/sendMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
const clean = (value) => String(value || "").trim();
const resultFor = (value) => {
  const result = clean(value).toUpperCase();
  if (["PASSED", "PASS"].includes(result)) return "PASSED";
  if (["FAILED", "FAIL", "NOT PASSED"].includes(result)) return "FAILED";
  return "";
};

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const appointments = await getGHPAppointments();
    appointments.sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0));
    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Failed to load GHP appointments." }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const body = await request.json();
    if (body.action !== "sync-manual-results") return NextResponse.json({ success: false, error: "Unsupported GHP action." }, { status: 400 });
    const [appointments, entries] = await Promise.all([getGHPAppointments(), getGHPManualEntries()]);
    let notified = 0; let skipped = 0; const errors = [];
    for (const entry of entries) {
      const result = resultFor(entry.result || entry.status || entry.exam_result);
      if (!result || clean(entry.notification_sent_at)) continue;
      const email = clean(entry.email).toLowerCase(); const appointmentId = clean(entry.appointment_id);
      const appointment = appointments.find((item) => appointmentId ? item.appointment_id === appointmentId : clean(item.email).toLowerCase() === email);
      if (!appointment) { skipped += 1; errors.push(`No appointment found for ${appointmentId || email || `Manual Entries row ${entry._rowNumber}`}.`); continue; }
      const record = await updateGHPAppointment(appointment.appointment_id, {
        status: result === "PASSED" ? "Passed" : "Failed", exam_result: result,
        exam_score: clean(entry.score || entry.exam_score), exam_recorded_at: clean(entry.exam_date) || new Date().toISOString(),
        certificate_number: result === "PASSED" ? clean(entry.certificate_number || entry.cert_number) : "",
      });
      try {
        await sendGHPExamResult(record);
        await markGHPManualEntryNotified(entry._rowNumber);
        await updateGHPAppointment(appointment.appointment_id, { result_notification_sent_at: new Date().toISOString() });
        notified += 1;
      } catch (error) { errors.push(`${record.name}: ${error.message || "email could not be sent"}`); }
    }
    return NextResponse.json({ success: true, notified, skipped, message: notified ? `${notified} examination result email${notified === 1 ? "" : "s"} sent.` : "No new manual examination results to notify.", errors });
  } catch (error) {
    console.error("GHP manual result sync error:", error);
    return NextResponse.json({ success: false, error: error.message || "GHP result sync failed." }, { status: 500 });
  }
}
