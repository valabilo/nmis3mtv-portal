import { NextResponse } from "next/server";
import { getGHPAppointments, updateGHPAppointment } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { sendGHPCertificate, sendGHPSeminarNotification } from "@/lib/sendMail";
import { createGHPCertificatePdf } from "@/lib/ghpCertificate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
const clean = (value, limit = 300) => String(value || "").trim().slice(0, limit);

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
    const appointmentId = clean(body.appointmentId, 80);
    if (!appointmentId) return NextResponse.json({ success: false, error: "Appointment ID is required." }, { status: 400 });
    if (body.action === "schedule") {
      const updates = {
        status: "Scheduled", seminar_date: clean(body.seminarDate, 20), seminar_time: clean(body.seminarTime, 40),
        seminar_venue: clean(body.seminarVenue), meeting_link: clean(body.meetingLink), notification_sent_at: new Date().toISOString(),
      };
      if (!updates.seminar_date || !updates.seminar_time || (!updates.seminar_venue && !updates.meeting_link)) {
        return NextResponse.json({ success: false, error: "Date, time, and a venue or online link are required." }, { status: 400 });
      }
      const record = await updateGHPAppointment(appointmentId, updates);
      await sendGHPSeminarNotification(record);
      return NextResponse.json({ success: true, appointment: record, message: "Seminar schedule saved and email sent." });
    }
    if (body.action === "issue-certificate") {
      const certificateNumber = clean(body.certificateNumber, 80) || `GHP-${new Date().getFullYear()}-${appointmentId.slice(0, 8).toUpperCase()}`;
      const record = await updateGHPAppointment(appointmentId, {
        status: "Completed", certificate_number: certificateNumber, certificate_issued_at: new Date().toISOString(),
      });
      const pdf = await createGHPCertificatePdf(record);
      await sendGHPCertificate(record, pdf);
      const finalRecord = await updateGHPAppointment(appointmentId, { certificate_sent_at: new Date().toISOString() });
      return NextResponse.json({ success: true, appointment: finalRecord, message: "Certificate generated and emailed." });
    }
    return NextResponse.json({ success: false, error: "Unsupported GHP action." }, { status: 400 });
  } catch (error) {
    console.error("GHP admin action error:", error);
    return NextResponse.json({ success: false, error: error.message || "GHP appointment update failed." }, { status: 500 });
  }
}
