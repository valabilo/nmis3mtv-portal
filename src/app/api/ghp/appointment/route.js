import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { OFFICE_INFO } from "@/lib/constants";
import { getGHPAppointments, updateGHPAppointment } from "@/lib/googleSheets";
import { getGHPSeminarDates, isGHPSeminarDate, SEMINAR_CAPACITY, SEMINAR_SESSIONS } from "@/lib/ghpSchedule";
import { validateEmail, validateName } from "@/lib/validators";
import { sendGHPSeminarNotification } from "@/lib/sendMail";

export const runtime = "nodejs";

const clean = (value, limit = 300) => String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, limit);

async function reserveSeat(payload) {
  const webAppUrl = process.env.GHP_BOOKING_WEB_APP_URL?.trim();
  const secret = process.env.GHP_BOOKING_SECRET?.trim();
  if (!webAppUrl || !secret) throw new Error("GHP seat reservation is not configured. Set GHP_BOOKING_WEB_APP_URL and GHP_BOOKING_SECRET.");
  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, action: "reserveGhpAppointment", secret }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "Unable to reserve the seminar seat.");
  return result.appointment;
}

export async function GET() {
  try {
    const appointments = await getGHPAppointments();
    const schedules = getGHPSeminarDates().map((date) => {
      const active = appointments.filter((item) => item.seminar_date === date && !["Cancelled", "Failed"].includes(item.status));
      const sessions = SEMINAR_SESSIONS.map((session) => {
        const booked = active.filter((item) => item.seminar_time === session.id).length;
        return { ...session, capacity: SEMINAR_CAPACITY, booked, available: Math.max(SEMINAR_CAPACITY - booked, 0) };
      });
      return { date, sessions, available: sessions.reduce((total, session) => total + session.available, 0) };
    });
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load seminar availability." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const contact = clean(body.contact, 80);
    const seminarDate = clean(body.seminarDate, 20);
    const seminarTime = clean(body.seminarTime, 20);
    if (!validateName(name) || !validateEmail(email) || !/^\d{4}-\d{2}-\d{2}$/.test(seminarDate) || !SEMINAR_SESSIONS.some((session) => session.id === seminarTime)) {
      return NextResponse.json({ success: false, error: "Please provide a valid full name, email address, seminar date, and session time." }, { status: 400 });
    }
    if (!isGHPSeminarDate(seminarDate)) return NextResponse.json({ success: false, error: "Please choose an available scheduled seminar date." }, { status: 400 });
    const appointment = await reserveSeat({
      appointmentId: uuidv4(), name, email, contact, seminarDate, seminarTime, seminarVenue: OFFICE_INFO.address, remarks: clean(body.remarks),
    });
    try {
      await sendGHPSeminarNotification({ ...appointment, seminar_venue: appointment.seminar_venue || OFFICE_INFO.address });
      const savedAppointment = await updateGHPAppointment(appointment.appointment_id, {
        seminar_venue: appointment.seminar_venue || OFFICE_INFO.address,
        notification_sent_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, appointment: savedAppointment, emailSent: true }, { status: 201 });
    } catch (emailError) {
      console.error("GHP booking confirmation email failed:", emailError);
      return NextResponse.json({
        success: true,
        appointment,
        emailSent: false,
        warning: "Your booking was saved, but the confirmation email could not be sent. Please contact NMIS RTOC III.",
      }, { status: 201 });
    }
  } catch (error) {
    console.error("GHP appointment error:", error);
    return NextResponse.json({ success: false, error: error.message || "Unable to save your appointment." }, { status: 500 });
  }
}
