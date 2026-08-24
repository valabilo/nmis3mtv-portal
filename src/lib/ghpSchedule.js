const DEFAULT_FIRST_SEMINAR_DATE = "2026-08-28";
const SEMINAR_CAPACITY = 30;
const SEMINAR_SESSIONS = [
  { id: "08:00-10:00", label: "8:00 AM – 10:00 AM" },
  { id: "10:00-12:00", label: "10:00 AM – 12:00 PM" },
  { id: "13:00-15:00", label: "1:00 PM – 3:00 PM" },
  { id: "15:00-17:00", label: "3:00 PM – 5:00 PM" },
];

function dateOnlyInManila() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function isFriday(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 5;
}

/** Public bookings close at 7:00 AM (Asia/Manila) on the seminar date. */
export function isGHPRegistrationOpen(seminarDate, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(seminarDate || ""))) return false;
  const manila = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23", minute: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(manila.map(({ type, value: part }) => [type, part]));
  const currentDate = `${value.year}-${value.month}-${value.day}`;
  if (currentDate < seminarDate) return true;
  if (currentDate > seminarDate) return false;
  return Number(value.hour) < 7;
}

/** The first seminar is a one-off Thursday; Friday resumes the following week. */
export function getGHPSeminarDates(count = 12) {
  const firstDate = process.env.GHP_FIRST_SEMINAR_DATE || DEFAULT_FIRST_SEMINAR_DATE;
  const today = dateOnlyInManila();
  const dates = [];

  if (firstDate >= today) dates.push(firstDate);
  // Start one full week later so the Friday in the Thursday seminar's week
  // is not offered as a second schedule.
  let cursor = addDays(firstDate, 7);
  while (dates.length < count) {
    if (cursor >= today && isFriday(cursor)) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function isGHPSeminarDate(date) {
  return getGHPSeminarDates(53).includes(date);
}

export { SEMINAR_CAPACITY, SEMINAR_SESSIONS };
