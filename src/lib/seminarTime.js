function formatClock(hour, minute) {
  const value = Number(hour);
  const suffix = value >= 12 ? "PM" : "AM";
  const twelveHour = value % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Converts stored 24-hour session ranges, e.g. 13:00-15:00, for display. */
export function formatSeminarTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return String(value || "To be advised");
  return `${formatClock(match[1], match[2])} – ${formatClock(match[3], match[4])}`;
}
