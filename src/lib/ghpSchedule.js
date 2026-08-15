const DEFAULT_FIRST_SEMINAR_DATE = "2026-08-20";
const SEMINAR_CAPACITY = 30;

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

/** The first seminar is a one-off Thursday; every later seminar is Friday. */
export function getGHPSeminarDates(count = 12) {
  const firstDate = process.env.GHP_FIRST_SEMINAR_DATE || DEFAULT_FIRST_SEMINAR_DATE;
  const today = dateOnlyInManila();
  const dates = [];

  if (firstDate >= today) dates.push(firstDate);
  let cursor = addDays(firstDate, 1);
  while (dates.length < count) {
    if (cursor >= today && isFriday(cursor)) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function isGHPSeminarDate(date) {
  return getGHPSeminarDates(53).includes(date);
}

export { SEMINAR_CAPACITY };
