import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createGHPAppointment } from "@/lib/googleSheets";
import { validateEmail, validateName } from "@/lib/validators";

export const runtime = "nodejs";

const clean = (value, limit = 300) => String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, limit);

export async function POST(request) {
  try {
    const body = await request.json();
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const contact = clean(body.contact, 80);
    const preferredDate = clean(body.preferredDate, 20);
    if (!validateName(name) || !validateEmail(email)) {
      return NextResponse.json({ success: false, error: "Please provide a valid full name and email address." }, { status: 400 });
    }
    const appointment = await createGHPAppointment({
      appointmentId: uuidv4(), name, email, contact, preferredDate, remarks: clean(body.remarks),
    });
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error("GHP appointment error:", error);
    return NextResponse.json({ success: false, error: error.message || "Unable to save your appointment." }, { status: 500 });
  }
}
