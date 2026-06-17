function firstValue(row, keys) {
  for (const key of keys) {
    if (row?.[key]) return row[key];
  }

  return "";
}

function parseDateOnly(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, first, second, rawYear] = slashMatch;
    const year = Number(rawYear.length === 2 ? `20${rawYear}` : rawYear);
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const day = firstNumber > 12 ? firstNumber : secondNumber;
    const month = firstNumber > 12 ? secondNumber : firstNumber;

    return new Date(Date.UTC(year, month - 1, day));
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30));
      date.setUTCDate(date.getUTCDate() + Math.floor(serial));
      return date;
    }
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isExpiredByDate(value) {
  const expiry = parseDateOnly(value);
  if (!expiry) return false;

  return expiry < todayDateOnly();
}

export function accreditedStatusForRow(row) {
  const status = firstValue(row, ["status"]);
  const expiry = firstValue(row, [
    "expiry",
    "expiry_date",
    "expiration_date",
    "valid_until",
  ]);
  const normalizedStatus = String(status).trim().toLowerCase();
  const statusLabels = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    revoked: "Revoked",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  if (["inactive", "suspended", "revoked", "cancelled"].includes(normalizedStatus)) {
    return statusLabels[normalizedStatus];
  }

  if (normalizedStatus === "expired" || isExpiredByDate(expiry)) {
    return "Expired";
  }

  return statusLabels[normalizedStatus] || "Active";
}
