import { getRegistrationSettings } from "@/lib/googleSheets";

function manilaDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  // datetime-local values have no zone. Treat every admin-entered time as
  // Philippine time, rather than the timezone of the deployment server.
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function registrationStatus(settings, now = new Date()) {
  const closeAt = manilaDate(settings.close_at);
  const reopenAt = manilaDate(settings.reopen_at);
  const manuallyEnabled = String(settings.enabled).toLowerCase() !== "false";
  const withinClosure = closeAt && now >= closeAt && (!reopenAt || now < reopenAt);
  const open = manuallyEnabled && !withinClosure;
  return {
    open,
    message: String(settings.message || "Registration is currently closed. Please check back later."),
    closeAt: settings.close_at || "",
    reopenAt: settings.reopen_at || "",
    enabled: manuallyEnabled,
  };
}

export async function getRegistrationStatus() {
  return registrationStatus(await getRegistrationSettings());
}
