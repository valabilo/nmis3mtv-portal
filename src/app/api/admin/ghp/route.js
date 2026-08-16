import { NextResponse } from "next/server";
import { deleteGHPAppointment, getCertificateIssuance, getGHPAppointments, getGHPManualEntries, markGHPManualEntryNotified, saveGHPManualEntry, updateGHPAppointment } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { sendGHPExamResult } from "@/lib/sendMail";
import { generateCertNumber } from "@/lib/certNumber";

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
    const [appointments, certificates] = await Promise.all([getGHPAppointments(), getCertificateIssuance()]);
    const readyCertificateNumbers = new Set(
      certificates
        .filter((certificate) => String(certificate.pdf_file_id || certificate.certificate_pdf_file_id || certificate.drive_file_id || "").trim())
        .map((certificate) => String(certificate.control_no || certificate.certificate_number || "").trim().toUpperCase())
        .filter(Boolean),
    );
    appointments.forEach((appointment) => {
      appointment.certificate_ready = readyCertificateNumbers.has(String(appointment.certificate_number || "").trim().toUpperCase());
    });
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

export async function POST(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const body = await request.json();
    const appointmentId = clean(body.appointmentId); const score = clean(body.score); const numericScore = Number(score);
    if (!appointmentId || !/^\d+(\.\d+)?$/.test(score) || numericScore < 0 || numericScore > 10) return NextResponse.json({ success: false, error: "Enter a score from 0 to 10." }, { status: 400 });
    const appointments = await getGHPAppointments();
    const appointment = appointments.find((item) => item.appointment_id === appointmentId);
    if (!appointment) return NextResponse.json({ success: false, error: "GHP appointment not found." }, { status: 404 });
    const result = numericScore >= 7 ? "PASSED" : "FAILED";
    const certificateNumber = result === "PASSED" ? (clean(appointment.certificate_number) || generateCertNumber()) : "";
    const entry = await saveGHPManualEntry({ appointmentId, email: appointment.email, score: `${score}/10`, result, certificateNumber });
    const record = await updateGHPAppointment(appointmentId, { status: result === "PASSED" ? "Passed" : "Failed", exam_result: result, exam_score: `${score}/10`, exam_recorded_at: new Date().toISOString(), certificate_number: certificateNumber, certificate_issued_at: result === "PASSED" ? (appointment.certificate_issued_at || new Date().toISOString()) : "" });
    return NextResponse.json({ success: true, entry, appointment: record });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to save the exam result." }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const appointmentId = clean(request.nextUrl.searchParams.get("appointmentId"));
    if (!appointmentId) return NextResponse.json({ success: false, error: "GHP appointment ID is required." }, { status: 400 });
    await deleteGHPAppointment(appointmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to delete the GHP appointment." }, { status: 500 });
  }
}
