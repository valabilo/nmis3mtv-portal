import { NextResponse } from "next/server";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { getGHPRegistrationClosures, getRegistrationSettings, setGHPRegistrationClosure, updateRegistrationSettings } from "@/lib/googleSheets";
import { registrationStatus } from "@/lib/registrationControl";
import { getGHPSeminarDates, SEMINAR_SESSIONS } from "@/lib/ghpSchedule";

const unauthorized = () => NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
const clean = (value, limit = 250) => String(value || "").trim().slice(0, limit);
const validDateTime = (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const [settings, closures] = await Promise.all([getRegistrationSettings(), getGHPRegistrationClosures()]);
    return NextResponse.json({ success: true, settings, status: registrationStatus(settings), seminarDates: getGHPSeminarDates(53), sessions: SEMINAR_SESSIONS, closures });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load registration settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!requestHasDashboardSession(request)) return unauthorized();
  try {
    const body = await request.json();
    if (body.action === "set-ghp-closure") {
      const seminarDate = clean(body.seminarDate, 10);
      const seminarTime = clean(body.seminarTime, 20);
      if (!getGHPSeminarDates(53).includes(seminarDate) || !["ALL", ...SEMINAR_SESSIONS.map((session) => session.id)].includes(seminarTime)) return NextResponse.json({ success: false, error: "Select a valid seminar date and session." }, { status: 400 });
      const closure = await setGHPRegistrationClosure({ seminarDate, seminarTime, closed: Boolean(body.closed) });
      const closures = await getGHPRegistrationClosures();
      return NextResponse.json({ success: true, closure, closures });
    }
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
