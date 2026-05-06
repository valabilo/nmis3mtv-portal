import { google } from "googleapis";

// ── Auth ──────────────────────────────────────────────────────────
function getSheetsClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob",
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID in environment variables.");
  }

  if (spreadsheetId.startsWith("http")) {
    throw new Error(
      "GOOGLE_SHEET_ID must be only the spreadsheet ID, not the full Google Sheets URL.",
    );
  }

  return spreadsheetId;
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
}

function columnLabel(index) {
  let label = "";
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
}

// ── Generic helpers ───────────────────────────────────────────────
/**
 * Reads all rows from a sheet tab and returns them as objects.
 * First row = headers (lowercased, spaces → underscores).
 * @param {string} sheetName
 * @returns {Promise<Record<string, string>[]>}
 */
export async function readSheet(sheetName) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    String(header).trim().toLowerCase().replace(/\s+/g, "_"),
  );

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

/**
 * Appends a single row to a sheet tab.
 * @param {string} sheetName
 * @param {string[]} rowData
 */
export async function appendRow(sheetName, rowData) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowData],
    },
  });
}

export async function ensureHeaders(sheetName, expectedHeaders) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const sheetRef = quoteSheetName(sheetName);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetRef}!1:1`,
  });
  const currentHeaders = response.data.values?.[0] ?? [];
  const legacyApplicationHeaders = new Set([
    "firstname",
    "lastname",
    "middlename",
    "suffix",
    "owner_name_on_cr",
    "operator_name",
    "business_tin",
  ]);
  const normalizedExpectedHeaders = new Set(expectedHeaders);
  const customHeaders = currentHeaders.filter(
    (header) =>
      header &&
      !normalizedExpectedHeaders.has(header) &&
      !legacyApplicationHeaders.has(header),
  );
  const nextHeaders = [...expectedHeaders, ...customHeaders];

  const needsUpdate =
    currentHeaders.length < expectedHeaders.length ||
    expectedHeaders.some((header, index) => currentHeaders[index] !== header);

  if (!needsUpdate) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetRef}!A1:${columnLabel(nextHeaders.length)}1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [nextHeaders],
    },
  });
}

// ── Domain-specific helpers ───────────────────────────────────────
export async function getAccreditedList() {
  return readSheet("Accredited");
}

export async function getBannedList() {
  return readSheet("Banned");
}

/**
 * Saves a completed GHP certificate record.
 * Sheet tab name: GHP_Completions
 * Columns: cert_number | timestamp | name | email | score | pct | issued_date
 */
export async function saveGHPCompletion(data) {
  return appendRow("GHP_Completions", [
    data.certNumber,
    new Date().toISOString(),
    data.name,
    data.email,
    `${data.score}/${data.total}`,
    `${data.pct}%`,
    data.issuedDate,
  ]);
}

/**
 * Saves a new MTV application.
 * Sheet tab name: Applications
 */
const APPLICATION_HEADERS = [
  "ref_number",
  "timestamp",
  "application_type",
  "registered_owner",
  "email",
  "contact",
  "address",
  "region",
  "province",
  "ghp_cert_number",
  "plate",
  "vtype",
  "vmake",
  "vmodel",
  "vyear",
  "capacity",
  "bname",
  "btype",
  "baddress",
  "drive_folder_id",
  "status",
  "vcolor",
  "vengine",
  "vchassis",
  "cr_number",
  "or_number",
  "lto_client_id",
  "body_type",
  "fuel_type",
  "cooling",
  "gross_weight",
  "net_capacity",
  "material",
  "meat_establishment",
  "intended_route",
];

export async function saveApplication(data) {
  await ensureHeaders("Applications", APPLICATION_HEADERS);

  return appendRow("Applications", [
    data.refNumber,
    new Date().toISOString(),
    data.applicationType ?? "",
    data.registeredOwner,
    data.email,
    data.contact,
    data.address,
    data.region ?? "",
    data.province ?? "",
    data.ghpCertNumber ?? "",
    data.plate,
    data.vtype,
    data.vmake,
    data.vmodel,
    data.vyear,
    data.capacity,
    data.bname || data.meatEstablishment || "",
    data.btype ?? "",
    data.baddress || data.intendedRoute || "",
    data.driveFolderId ?? "",
    "Pending",
    data.vcolor ?? "",
    data.vengine ?? "",
    data.vchassis ?? "",
    data.crNumber ?? "",
    data.orNumber ?? "",
    data.ltoClientId ?? "",
    data.bodyType ?? "",
    data.fuelType ?? "",
    data.cooling ?? "",
    data.grossWeight ?? "",
    data.netCapacity ?? "",
    data.material ?? "",
    data.meatEstablishment ?? "",
    data.intendedRoute ?? "",
  ]);
}

/**
 * Saves a contact form message.
 * Sheet tab name: Contact
 */
export async function saveContactMessage(data) {
  return appendRow("Contact", [
    new Date().toISOString(),
    data.name,
    data.email,
    data.phone ?? "",
    data.subject,
    data.message,
    "Unread",
  ]);
}
