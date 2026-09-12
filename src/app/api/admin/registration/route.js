import { NextResponse } from "next/server";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { getRegistrationSettings, updateRegistrationSettings } from "@/lib/googleSheets";
import { registrationStatus } from "@/lib/registrationControl";

const unauthorized = () => NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
const clean = (value, limit = 250) => String(value || "").trim().slice(0, limit);
const validDateTime = (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const settings = await getRegistrationSettings();
    return NextResponse.json({ success: true, settings, status: registrationStatus(settings) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load registration settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const body = await request.json();
    const close_at = clean(body.close_at, 16);
    const reopen_at = clean(body.reopen_at, 16);
    if (!validDateTime(close_at) || !validDateTime(reopen_at)) return NextResponse.json({ success: false, error: "Use a valid date and time." }, { status: 400 });
    if (close_at && reopen_at && reopen_at <= close_at) return NextResponse.json({ success: false, error: "The reopening time must be after the closing time." }, { status: 400 });
    const settings = await updateRegistrationSettings({ enabled: body.enabled === false ? "false" : "true", close_at, reopen_at, message: clean(body.message, 250) || "Registration is currently closed. Please check back later." });
    return NextResponse.json({ success: true, settings, status: registrationStatus(settings) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to save registration settings." }, { status: 500 });
  }
}
