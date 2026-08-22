import { google } from "googleapis";
import { OFFICE_INFO } from "@/lib/constants";
import { buildOrderOfPaymentData } from "@/lib/orderOfPayment";

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

function normalizeHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function orderOfPaymentBillNumber(reference) {
  const digits = String(reference || "").replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
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

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

async function readSheetWithRowNumbers(sheetName) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 1) return { headers: [], rows: [] };

  const headers = rows[0].map(normalizeHeader);

  if (rows.length < 2) return { headers, rows: [] };

  return {
    headers,
    rows: rows.slice(1).map((row, index) => {
      const obj = { _rowNumber: index + 2 };
      headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex] ?? "";
      });
      return obj;
    }),
  };
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

/**
 * Ensures the header row of a sheet tab matches expectedHeaders.
 * If the sheet tab does not exist, it is created first.
 * Missing headers are appended on existing sheets to avoid shifting row data.
 * @param {string} sheetName
 * @param {string[]} expectedHeaders
 */
export async function ensureHeaders(sheetName, expectedHeaders) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const sheetRef = quoteSheetName(sheetName);

  // Try to read the first row; if the sheet doesn't exist yet, create it.
  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetRef}!1:1`,
    });
  } catch (err) {
    // "Unable to parse range" means the sheet tab doesn't exist yet.
    if (
      err.message?.includes("Unable to parse range") ||
      err.message?.includes("Requested entity was not found")
    ) {
      // Create the missing sheet tab.
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        },
      });

      // Write headers to the freshly created sheet and return.
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetRef}!A1:${columnLabel(expectedHeaders.length)}1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [expectedHeaders],
        },
      });
      return;
    }

    // Re-throw any other unexpected error.
    throw err;
  }

  const currentHeaders = response.data.values?.[0] ?? [];

  const currentHeaderSet = new Set(currentHeaders.filter(Boolean));
  const missingHeaders = expectedHeaders.filter(
    (header) => !currentHeaderSet.has(header),
  );

  const nextHeaders = currentHeaders.length
    ? [...currentHeaders, ...missingHeaders]
    : expectedHeaders;

  const needsUpdate = missingHeaders.length > 0 || currentHeaders.length === 0;

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

export async function createBannedRecord(record) {
  const date = String(record.date || "").trim() || formatDateOnly(todayDateOnly());
  const status = String(record.status || "").trim() || "Banned";
  const valuesByHeader = {
    plate: String(record.plate || "").trim().toUpperCase(),
    plate_no: String(record.plate || "").trim().toUpperCase(),
    plate_number: String(record.plate || "").trim().toUpperCase(),
    business: String(record.business || "").trim(),
    business_name: String(record.business || "").trim(),
    bname: String(record.business || "").trim(),
    owner: String(record.owner || "").trim(),
    applicant: String(record.owner || "").trim(),
    name: String(record.owner || "").trim(),
    operator: String(record.owner || "").trim(),
    proprietor: String(record.owner || "").trim(),
    reason: String(record.reason || "").trim(),
    violation: String(record.reason || "").trim(),
    remarks: String(record.reason || "").trim(),
    date,
    date_banned: date,
    banned_date: date,
    timestamp: date,
    status,
    created_at: new Date().toISOString(),
  };

  if (!valuesByHeader.plate) {
    throw new Error("Plate number is required.");
  }

  if (!valuesByHeader.reason) {
    throw new Error("Reason is required.");
  }

  await ensureHeaders("Banned", [
    "plate",
    "business",
    "owner",
    "reason",
    "date",
    "status",
    "created_at",
  ]);

  const { headers } = await readSheetWithRowNumbers("Banned");
  const rowValues = headers.map((header) => valuesByHeader[header] ?? "");

  await appendRow("Banned", rowValues);

  return {
    plate: valuesByHeader.plate,
    business: valuesByHeader.business,
    owner: valuesByHeader.owner,
    reason: valuesByHeader.reason,
    date,
    status,
    created_at: valuesByHeader.created_at,
  };
}

export async function getGHPCompletions() {
  return readSheet("GHP_Completions");
}

const GHP_APPOINTMENT_HEADERS = [
  "appointment_id",
  "requested_at",
  "name",
  "email",
  "contact",
  "company_name",
  "position",
  "meat_establishment",
  "valid_id_file_id",
  "valid_id_file_name",
  "preferred_date",
  "remarks",
  "status",
  "seminar_date",
  "seminar_time",
  "seminar_venue",
  "meeting_link",
  "notification_sent_at",
  "certificate_number",
  "certificate_issued_at",
  "certificate_sent_at",
  "exam_result",
  "exam_score",
  "exam_recorded_at",
  "result_notification_sent_at",
];

export async function createGHPAppointment(data) {
  await ensureHeaders("GHP_Appointments", GHP_APPOINTMENT_HEADERS);
  const appointmentId = data.appointmentId;
  const requestedAt = new Date().toISOString();
  const seminarVenue = data.seminarVenue || data.seminar_venue || OFFICE_INFO.address;

  await appendRow("GHP_Appointments", [
    appointmentId, requestedAt, data.name, data.email, data.contact || "", data.companyName || "", data.position || "", data.meatEstablishment || "", data.validIdFileId || "", data.validIdFileName || "",
    data.seminarDate || "", data.remarks || "", "Scheduled", data.seminarDate || "", data.seminarTime || "", "", "", "", "", "", "", "", "", "", "", "",
  ]);
  return {
    ...data,
    appointmentId,
    requestedAt,
    preferredDate: data.seminarDate,
    seminar_date: data.seminarDate,
    seminar_time: data.seminarTime,
    seminar_venue: seminarVenue,
    status: "Scheduled",
  };
}

export async function getGHPAppointments() {
  await ensureHeaders("GHP_Appointments", GHP_APPOINTMENT_HEADERS);
  const { rows } = await readSheetWithRowNumbers("GHP_Appointments");
  return rows;
}

export async function updateGHPAppointment(appointmentId, updates) {
  await ensureHeaders("GHP_Appointments", GHP_APPOINTMENT_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("GHP_Appointments");
  const record = rows.find((row) => row.appointment_id === appointmentId);
  if (!record) throw new Error("GHP appointment not found.");
  const values = headers.map((header) => updates[header] ?? record[header] ?? "");
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheetName("GHP_Appointments")}!A${record._rowNumber}:${columnLabel(headers.length)}${record._rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

export async function deleteGHPAppointment(appointmentId) {
  await ensureHeaders("GHP_Appointments", GHP_APPOINTMENT_HEADERS);
  const { rows } = await readSheetWithRowNumbers("GHP_Appointments");
  const record = rows.find((row) => row.appointment_id === appointmentId);
  if (!record) throw new Error("GHP appointment not found.");

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const sheet = (metadata.data.sheets || []).find(
    (item) => item.properties?.title === "GHP_Appointments",
  );
  if (sheet?.properties?.sheetId === undefined) throw new Error("GHP_Appointments sheet not found.");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: record._rowNumber - 1,
            endIndex: record._rowNumber,
          },
        },
      }],
    },
  });
}

const GHP_MANUAL_ENTRY_HEADERS = [
  "appointment_id",
  "email",
  "result",
  "score",
  "certificate_number",
  "exam_date",
  "notification_sent_at",
];

export async function getGHPManualEntries() {
  await ensureHeaders("Manual Entries", GHP_MANUAL_ENTRY_HEADERS);
  const { rows } = await readSheetWithRowNumbers("Manual Entries");
  return rows;
}

export async function saveGHPManualEntry(data) {
  await ensureHeaders("Manual Entries", GHP_MANUAL_ENTRY_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Manual Entries");
  const record = rows.find((row) => row.appointment_id === data.appointmentId);
  const values = headers.map((header) => ({
    appointment_id: data.appointmentId,
    email: data.email,
    result: data.result,
    score: data.score,
    certificate_number: data.certificateNumber || "",
    exam_date: data.examDate || new Date().toISOString().slice(0, 10),
  }[header] ?? (record?.[header] ?? "")));
  const sheets = getSheetsClient();
  if (record) {
    await sheets.spreadsheets.values.update({ spreadsheetId: getSpreadsheetId(), range: `${quoteSheetName("Manual Entries")}!A${record._rowNumber}:${columnLabel(headers.length)}${record._rowNumber}`, valueInputOption: "USER_ENTERED", requestBody: { values: [values] } });
  } else {
    await appendRow("Manual Entries", values);
  }
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

export async function markGHPManualEntryNotified(rowNumber) {
  await ensureHeaders("Manual Entries", GHP_MANUAL_ENTRY_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Manual Entries");
  const record = rows.find((row) => row._rowNumber === rowNumber);
  if (!record) throw new Error("Manual exam entry not found.");
  const values = headers.map((header) =>
    header === "notification_sent_at" ? new Date().toISOString() : (record[header] ?? ""),
  );
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheetName("Manual Entries")}!A${rowNumber}:${columnLabel(headers.length)}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

export async function getCertificateIssuance() {
  return readSheet("Certificate Issuance");
}

export async function getReferenceIssuances() {
  return readSheet("Reference Issuances");
}

export async function getOnlinePaymentRecord(refNumber) {
  const normalizedRef = String(refNumber || "").trim().toUpperCase();
  if (!normalizedRef) return null;

  let rows = [];
  try {
    rows = await readSheet("Online Payment");
  } catch (error) {
    if (
      error.message?.includes("Unable to parse range") ||
      error.message?.includes("Requested entity was not found")
    ) {
      return null;
    }
    throw error;
  }

  return findOnlinePaymentRow(rows, normalizedRef);
}

function findOnlinePaymentRow(rows, normalizedRef) {
  const expectedBillNo = orderOfPaymentBillNumber(normalizedRef);

  return (
    rows.find((row) => {
      const referenceNumber = String(row.reference_number || "").trim().toUpperCase();
      const code = String(row.code || "").trim().toUpperCase();

      return (
        referenceNumber === normalizedRef ||
        (expectedBillNo && code === expectedBillNo)
      );
    }) || null
  );
}

function paymentReferenceFromPaymentRow(paymentRow, normalizedRef) {
  const referenceNumber = String(paymentRow?.reference_number || "").trim();
  if (referenceNumber && referenceNumber.toUpperCase() !== normalizedRef) {
    return referenceNumber;
  }

  return String(
    paymentRow?.payment_reference_number || paymentRow?.payment_ref_number || "",
  ).trim();
}

function receiptNumberFromPaymentRow(paymentRow, normalizedRef) {
  return paymentReferenceFromPaymentRow(paymentRow, normalizedRef);
}

export async function getEstablishmentTypes() {
  const rows = await readSheet("EstablishmentType");
  return rows
    .filter((row) => String(row.active || "yes").trim().toLowerCase() !== "no")
    .map((row, index) => ({
      title: row.title || row.name || "",
      description: row.description || row.details || "",
      fileUrl: row.file_url || row.url || row.link || "",
      type: row.type || "",
      order: Number(row.order || row.sort_order || index + 1),
    }))
    .filter((item) => item.title)
    .sort((a, b) => a.order - b.order);
}

export async function getEstablishmentNames() {
  const rows = await readSheet("EstablishmentName");
  return rows
    .filter((row) => String(row.active || "yes").trim().toLowerCase() !== "no")
    .map((row, index) => ({
      title:
        row.title ||
        row.name ||
        row.establishment_name ||
        row.meat_establishment ||
        "",
      description: row.description || row.details || row.address || "",
      type: row.type || row.establishment_type || "",
      order: Number(row.order || row.sort_order || index + 1),
    }))
    .filter((item) => item.title)
    .sort((a, b) => a.order - b.order);
}

export async function getApplications() {
  const { rows } = await readSheetWithRowNumbers("Applications");
  return rows;
}

export async function getApplicationByRef(refNumber) {
  const normalizedRef = String(refNumber || "").trim().toUpperCase();
  if (!normalizedRef) return null;

  const { rows } = await readSheetWithRowNumbers("Applications");
  return (
    rows.find(
      (row) =>
        String(row.ref_number || "").trim().toUpperCase() === normalizedRef,
    ) || null
  );
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
 *
 * Header row (30 columns):
 * ref_number | timestamp | application_type | registered_owner | email | contact |
 * address | region | province | ghp_cert_number | plate | vtype | vmake | vmodel |
 * vyear | capacity | bname | btype | baddress | drive_folder_id | status |
 * vcolor | vengine | vchassis | cr_number | or_number | cooling | material |
 * meat_establishment | intended_route | remarks | reference_number | receipt_no |
 * status_history | amendment_ref | document_review
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
  "cooling",
  "material",
  "meat_establishment",
  "intended_route",
  "remarks",
  "Reference Number",
  "receipt_no",
  "status_history",
  "amendment_ref",
  "document_review",
];

const ONLINE_PAYMENT_HEADERS = [
  "Code",
  "Serial No.",
  "Date issued",
  "Name of payor",
  "Address/Office of Payor",
  "Amount",
  "Purpose",
  "Payment Code",
  "Issued Date",
  "Reference Number",
  "Date of Payment",
  "Payment Submitted At",
  "Payment Verified At",
  "Verification Source",
  "Proof of Payment File ID",
  "Proof of Payment File Name",
];

function parseStatusHistory(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusHistoryForRow(row) {
  const history = parseStatusHistory(row.status_history);
  if (history.length) return history;

  return [
    {
      status: row.status || "Application Received",
      remarks: row.remarks || "Application submitted.",
      timestamp: row.timestamp || new Date().toISOString(),
    },
  ];
}

function parseDocumentReview(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function buildApplicationRowValues(headers, data, existing = {}, overrides = {}) {
  const timestamp = overrides.timestamp ?? new Date().toISOString();
  const status = overrides.status ?? "Application Received";
  const remarks = overrides.remarks ?? "";
  const statusHistory =
    overrides.statusHistory ??
    JSON.stringify([
      {
        status,
        remarks: "Application submitted.",
        timestamp,
      },
    ]);

  const valuesByHeader = {
    ref_number: data.refNumber,
    timestamp,
    application_type: data.applicationType ?? "",
    registered_owner: data.registeredOwner,
    email: data.email,
    contact: data.contact,
    address: data.address,
    region: data.region ?? "",
    province: data.province ?? "",
    ghp_cert_number: data.ghpCertNumber ?? "",
    plate: data.plate,
    vtype: data.vtype,
    vmake: data.vmake,
    vmodel: data.vmodel,
    vyear: data.vyear,
    capacity: data.capacity,
    bname: data.bname || data.meatEstablishment || "",
    btype: data.btype ?? "",
    baddress: data.baddress || data.intendedRoute || "",
    drive_folder_id: data.driveFolderId ?? existing.drive_folder_id ?? "",
    status,
    vcolor: data.vcolor ?? "",
    vengine: data.vengine ?? "",
    vchassis: data.vchassis ?? "",
    cr_number: data.crNumber ?? "",
    or_number: data.orNumber ?? "",
    cooling: data.cooling ?? "",
    material: data.material ?? "",
    meat_establishment: data.meatEstablishment ?? "",
    intended_route: data.intendedRoute ?? "",
    remarks,
    reference_number:
      data.referenceNumber ?? data.reference_number ?? existing.reference_number ?? "",
    receipt_no: data.receiptNo ?? data.receipt_no ?? existing.receipt_no ?? "",
    status_history: statusHistory,
    amendment_ref: data.amendmentRef ?? existing.amendment_ref ?? "",
    document_review: existing.document_review ?? "",
  };

  return headers.map((header) => valuesByHeader[header] ?? existing[header] ?? "");
}

export async function saveApplication(data) {
  await ensureHeaders("Applications", APPLICATION_HEADERS);

  return appendRow(
    "Applications",
    buildApplicationRowValues(APPLICATION_HEADERS, data),
  );
}

export async function updateApplication(data) {
  await ensureHeaders("Applications", APPLICATION_HEADERS);

  const { headers, rows } = await readSheetWithRowNumbers("Applications");
  if (!headers.length) throw new Error("Applications sheet is missing a header row.");

  const normalizedRef = String(data.refNumber || "").trim().toUpperCase();
  const existing = rows.find(
    (row) => String(row.ref_number || "").trim().toUpperCase() === normalizedRef,
  );
  if (!existing) throw new Error("Application not found.");

  const now = new Date().toISOString();
  const previousHistory = statusHistoryForRow(existing);
  const nextHistory = [
    ...previousHistory,
    {
      status: "Application Received",
      previousStatus: existing.status || "Application Received",
      remarks: "Amendment submitted.",
      timestamp: now,
    },
  ];
  const rowValues = buildApplicationRowValues(headers, data, existing, {
    timestamp: now,
    status: "Application Received",
    remarks: "",
    statusHistory: JSON.stringify(nextHistory),
  });

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheetName("Applications")}!A${existing._rowNumber}:${columnLabel(headers.length)}${existing._rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowValues],
    },
  });

  return {
    ...existing,
    ...Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? ""])),
  };
}

export async function updateApplicationStatus(refNumber, status, remarks = "") {
  const allowedStatuses = new Set([
    "Application Received",
    "Under Review",
    "For Payment",
    "Rejected Application",
    "For Payment Verification",
    "Payment Verified",
    "Rejected Proof of Payment",
    "Completed",
    "Cancelled",
  ]);

  if (!allowedStatuses.has(status)) {
    throw new Error("Invalid application status.");
  }

  await ensureHeaders("Applications", APPLICATION_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Applications");
  const statusIndex = headers.indexOf("status");
  if (statusIndex < 0) throw new Error("Applications sheet is missing a status column.");
  const remarksIndex = headers.indexOf("remarks");
  const receiptIndex = headers.indexOf("receipt_no");
  const referenceNumberIndex = headers.indexOf("reference_number");
  const historyIndex = headers.indexOf("status_history");

  const normalizedRef = String(refNumber || "").trim().toUpperCase();
  const row = rows.find(
    (item) => String(item.ref_number || "").trim().toUpperCase() === normalizedRef,
  );

  if (!row) throw new Error("Application not found.");

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const trimmedRemarks = String(remarks || "").trim();
  const previousHistory = statusHistoryForRow(row);
  const statusEntry = {
    status,
    previousStatus: row.status || "Application Received",
    remarks: trimmedRemarks,
    timestamp: new Date().toISOString(),
  };
  const nextHistory = [...previousHistory, statusEntry];

  const data = [
    {
      range: `${quoteSheetName("Applications")}!${columnLabel(statusIndex + 1)}${row._rowNumber}`,
      values: [[status]],
    },
  ];

  if (remarksIndex >= 0) {
    data.push({
      range: `${quoteSheetName("Applications")}!${columnLabel(remarksIndex + 1)}${row._rowNumber}`,
      values: [[trimmedRemarks]],
    });
  }

  if (historyIndex >= 0) {
    data.push({
      range: `${quoteSheetName("Applications")}!${columnLabel(historyIndex + 1)}${row._rowNumber}`,
      values: [[JSON.stringify(nextHistory)]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  const updated = {
    ...row,
    previousStatus: row.status || "Application Received",
    remarks: trimmedRemarks,
    status,
    status_history: JSON.stringify(nextHistory),
  };

  if (status === "Payment Verified") {
    try {
      await ensureHeaders("Online Payment", ONLINE_PAYMENT_HEADERS);
      const paymentSheet = await readSheetWithRowNumbers("Online Payment");
      const paymentRow = findOnlinePaymentRow(paymentSheet.rows, normalizedRef);
      if (paymentRow) {
        const verifiedIndex = paymentSheet.headers.indexOf("payment_verified_at");
        const sourceIndex = paymentSheet.headers.indexOf("verification_source");
        const receiptNo = receiptNumberFromPaymentRow(paymentRow, normalizedRef);
        const paymentData = [];

        if (verifiedIndex >= 0) {
          paymentData.push({
            range: `${quoteSheetName("Online Payment")}!${columnLabel(verifiedIndex + 1)}${paymentRow._rowNumber}`,
            values: [[new Date().toISOString()]],
          });
        }

        if (sourceIndex >= 0) {
          paymentData.push({
            range: `${quoteSheetName("Online Payment")}!${columnLabel(sourceIndex + 1)}${paymentRow._rowNumber}`,
            values: [["NMIS manual verification"]],
          });
        }

        if (paymentData.length) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: "USER_ENTERED",
              data: paymentData,
            },
          });
        }

        if (receiptNo) {
          const receiptUpdateIndexes = [
            referenceNumberIndex,
            receiptIndex,
          ].filter((index) => index >= 0);

          if (receiptUpdateIndexes.length) {
            await sheets.spreadsheets.values.batchUpdate({
              spreadsheetId,
              requestBody: {
                valueInputOption: "USER_ENTERED",
                data: receiptUpdateIndexes.map((index) => ({
                  range: `${quoteSheetName("Applications")}!${columnLabel(index + 1)}${row._rowNumber}`,
                  values: [[receiptNo]],
                })),
              },
            });
          }
          updated.reference_number = receiptNo;
          updated.receipt_no = receiptNo;
        }
      }
    } catch (error) {
      console.error("Online Payment verification timestamp failed:", error);
    }
  }

  return updated;
}

export async function updateApplicationDocumentReview({
  refNumber,
  documentId,
  documentName = "",
  status,
}) {
  const allowedStatuses = new Set(["Approved", "Rejected"]);
  if (!allowedStatuses.has(status)) {
    throw new Error("Invalid document review status.");
  }

  const normalizedRef = String(refNumber || "").trim().toUpperCase();
  const normalizedDocumentId = String(documentId || "").trim();
  if (!normalizedRef) throw new Error("Application reference number is required.");
  if (!normalizedDocumentId) throw new Error("Document ID is required.");

  await ensureHeaders("Applications", APPLICATION_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Applications");
  const reviewIndex = headers.indexOf("document_review");
  if (reviewIndex < 0) throw new Error("Applications sheet is missing a document_review column.");

  const row = rows.find(
    (item) => String(item.ref_number || "").trim().toUpperCase() === normalizedRef,
  );
  if (!row) throw new Error("Application not found.");

  const review = parseDocumentReview(row.document_review);
  review[normalizedDocumentId] = {
    id: normalizedDocumentId,
    name: documentName || review[normalizedDocumentId]?.name || "",
    status,
    reviewedAt: new Date().toISOString(),
  };

  const reviewJson = JSON.stringify(review);
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheetName("Applications")}!${columnLabel(reviewIndex + 1)}${row._rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[reviewJson]],
    },
  });

  return {
    ...row,
    document_review: reviewJson,
  };
}

export async function upsertOnlinePaymentFromApplication(application) {
  await ensureHeaders("Online Payment", ONLINE_PAYMENT_HEADERS);

  const { headers, rows } = await readSheetWithRowNumbers("Online Payment");
  if (!headers.length) {
    throw new Error("Online Payment sheet is missing a header row.");
  }

  const normalizedRef = String(application.ref_number || application.reference || "")
    .trim()
    .toUpperCase();
  if (!normalizedRef) throw new Error("Application reference number is missing.");

  const existing = findOnlinePaymentRow(rows, normalizedRef);
  const payment = buildOrderOfPaymentData(application, existing || {});
  const dateIssued = payment.date.toISOString().slice(0, 10);
  const valuesByHeader = {
    code: payment.codeNo,
    serial_no: payment.serialNo,
    date_issued: dateIssued,
    name_of_payor: payment.owner,
    address_office_of_payor: payment.address,
    amount: payment.amount.toFixed(2),
    purpose: payment.purpose,
    payment_code: payment.paymentCode,
    issued_date: dateIssued,
    reference_number:
      receiptNumberFromPaymentRow(existing, normalizedRef) ||
      application.reference_number ||
      application.receipt_no ||
      application.receiptNo ||
      "",
    date_of_payment: existing?.date_of_payment || "",
  };
  const rowValues = headers.map(
    (header) => valuesByHeader[header] ?? existing?.[header] ?? "",
  );
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetName("Online Payment")}!A${existing._rowNumber}:${columnLabel(headers.length)}${existing._rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });
  } else {
    await appendRow("Online Payment", rowValues);
  }

  return Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? ""]));
}

export async function recordApplicantPaymentReference(refNumber, paymentReference, proofFile = {}) {
  const normalizedRef = String(refNumber || "").trim().toUpperCase();
  const normalizedPaymentReference = String(paymentReference || "").trim();

  if (!normalizedRef) throw new Error("Application reference number is required.");
  if (!normalizedPaymentReference) throw new Error("Payment reference number is required.");

  await ensureHeaders("Applications", APPLICATION_HEADERS);
  await ensureHeaders("Online Payment", ONLINE_PAYMENT_HEADERS);

  const application = await getApplicationByRef(normalizedRef);
  if (!application) throw new Error("Application not found.");

  const currentStatus = String(application.status || "").trim();
  if (!["For Payment", "Rejected Proof of Payment", "For Payment Verification"].includes(currentStatus)) {
    throw new Error("Proof of payment can only be submitted for applications awaiting payment.");
  }

  const { headers, rows } = await readSheetWithRowNumbers("Online Payment");
  const existing = findOnlinePaymentRow(rows, normalizedRef);
  const replacedProofFileId =
    existing?.proof_of_payment_file_id &&
    existing.proof_of_payment_file_id !== proofFile.fileId
      ? existing.proof_of_payment_file_id
      : "";
  const payment = buildOrderOfPaymentData(application, existing || {});
  const now = new Date().toISOString();
  const dateIssued = payment.date.toISOString().slice(0, 10);
  const dateOfPayment = now.slice(0, 10);
  const valuesByHeader = {
    code: payment.codeNo,
    serial_no: payment.serialNo,
    date_issued: existing?.date_issued || dateIssued,
    name_of_payor: payment.owner,
    address_office_of_payor: payment.address,
    amount: payment.amount.toFixed(2),
    purpose: payment.purpose,
    payment_code: payment.paymentCode,
    issued_date: existing?.issued_date || dateIssued,
    reference_number: normalizedPaymentReference,
    date_of_payment: existing?.date_of_payment || dateOfPayment,
    payment_reference_number: "",
    payment_submitted_at: now,
    payment_verified_at: "",
    verification_source: "Applicant portal",
    proof_of_payment_file_id: proofFile.fileId || existing?.proof_of_payment_file_id || "",
    proof_of_payment_file_name: proofFile.fileName || existing?.proof_of_payment_file_name || "",
  };
  const rowValues = headers.map(
    (header) => valuesByHeader[header] ?? existing?.[header] ?? "",
  );
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetName("Online Payment")}!A${existing._rowNumber}:${columnLabel(headers.length)}${existing._rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });
  } else {
    await appendRow("Online Payment", rowValues);
  }

  const updatedApplication =
    currentStatus === "For Payment Verification"
      ? application
      : await updateApplicationStatus(
          normalizedRef,
          "For Payment Verification",
          `Proof of payment submitted. Payment reference: ${normalizedPaymentReference}`,
        );

  return {
    application: updatedApplication,
    replacedProofFileId,
    onlinePayment: Object.fromEntries(
      headers.map((header, index) => [header, rowValues[index] ?? ""]),
    ),
  };
}

const ACCREDITED_HEADERS = [
  "DATE ISSUED",
  "NAME OF OWNER",
  "ADDRESS",
  "ESTABLISHMENT TYPE",
  "ESTABLISHMENT NAME",
  "PLATE NO.",
  "REGISTRATION NO.",
  "EXPIRY",
  "RECEIPT NO.",
  "Validity",
  "REMARKS",
  "Status",
];

const REGISTRATION_PREFIX = "NMIS-III-";
const REGISTRATION_SEQUENCE_FLOOR = 2593;
const ACCREDITED_FORMULA_HEADERS = new Set(["validity", "valid"]);

function registrationSequence(value) {
  const match = String(value || "").match(/^NMIS-III-(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function formatRegistrationNumber(sequence) {
  return `${REGISTRATION_PREFIX}${String(sequence).padStart(4, "0")}`;
}

function existingRegistrationNumber(row) {
  const candidates = [row?.registration_no, row?.ref_number, row?.reference];
  for (const candidate of candidates) {
    const sequence = registrationSequence(candidate);
    if (sequence) return formatRegistrationNumber(sequence);
  }

  return "";
}

function nextRegistrationNumber(rows) {
  const latest = rows.reduce(
    (max, row) =>
      Math.max(
        max,
        registrationSequence(row.registration_no || row.ref_number || row.reference),
      ),
    REGISTRATION_SEQUENCE_FLOOR,
  );

  return formatRegistrationNumber(latest + 1);
}

function rowNumberFromUpdatedRange(range) {
  const match = String(range || "").match(/![A-Z]+(\d+):/i);
  return match ? Number(match[1]) : 0;
}

async function appendAccreditedRow(headers, rowValues, valuesByHeader) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const firstFormulaIndex = headers.findIndex((header) =>
    ACCREDITED_FORMULA_HEADERS.has(header),
  );
  const appendValues =
    firstFormulaIndex >= 0 ? rowValues.slice(0, firstFormulaIndex) : rowValues;

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Accredited",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [appendValues],
    },
  });

  const rowNumber = rowNumberFromUpdatedRange(response.data.updates?.updatedRange);
  if (!rowNumber) return;

  const postFormulaData = headers.flatMap((header, index) => {
    if (index < firstFormulaIndex || ACCREDITED_FORMULA_HEADERS.has(header)) return [];
    if (!(header in valuesByHeader)) return [];
    return [
      {
        range: `${quoteSheetName("Accredited")}!${columnLabel(index + 1)}${rowNumber}`,
        values: [[valuesByHeader[header]]],
      },
    ];
  });

  if (!postFormulaData.length) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: postFormulaData,
    },
  });
}

function parseDateOnly(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (!text || /^(active|expired|inactive|suspended|revoked)$/i.test(text)) {
    return null;
  }

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

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function subtractMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() - months);
  return next;
}

function applicationTypeValue(application) {
  return String(application.applicationType || application.application_type || "").trim();
}

function isRenewalApplication(application) {
  return applicationTypeValue(application).toLowerCase() === "renewal";
}

function rowExpiryDate(row) {
  const candidates = [
    row?.expiry,
    row?.expiry_date,
    row?.expiration_date,
    row?.valid_until,
    row?.validity,
    row?.valid,
  ];

  for (const candidate of candidates) {
    const date = parseDateOnly(candidate);
    if (date) return date;
  }

  return null;
}

function latestAccreditedByPlate(rows, plate) {
  const normalizedPlate = normalizePlateKey(plate);
  if (!normalizedPlate) return null;

  return rows
    .filter((row) => {
      const rowPlate = normalizePlateKey(row.plate || row.plate_no || row.plate_number);
      return rowPlate === normalizedPlate;
    })
    .sort((a, b) => {
      const aExpiry = rowExpiryDate(a)?.getTime() || 0;
      const bExpiry = rowExpiryDate(b)?.getTime() || 0;
      return bExpiry - aExpiry;
    })[0] || null;
}

function normalizePlateKey(value) {
  return String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function applicationTimestamp(row) {
  const date = new Date(row?.timestamp || "");
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestApplicationByPlate(rows, plate) {
  const normalizedPlate = normalizePlateKey(plate);
  if (!normalizedPlate) return null;

  const matchingRows = rows.filter((row) => normalizePlateKey(row.plate) === normalizedPlate);
  const completedRows = matchingRows.filter(
    (row) => String(row.status || "").trim().toLowerCase() === "completed",
  );
  const candidates = completedRows.length ? completedRows : matchingRows;

  return [...candidates].sort(
    (a, b) => applicationTimestamp(b) - applicationTimestamp(a),
  )[0] || null;
}

function renewalWindow(existing, now = todayDateOnly()) {
  const expiry = rowExpiryDate(existing);
  if (!existing || !expiry) {
    return {
      eligible: false,
      error:
        "Renewal is only allowed for MTVs with an existing accredited record and expiry date.",
    };
  }

  const status = String(existing.status || "").trim().toLowerCase();
  if (["cancelled", "inactive", "revoked", "suspended"].includes(status)) {
    return {
      eligible: false,
      error: `Renewal is not allowed because this MTV accreditation is ${status}.`,
    };
  }

  const windowStart = subtractMonths(expiry, 2);
  if (now < windowStart) {
    return {
      eligible: false,
      error: `This MTV is not yet expiring soon. Renewal is allowed only for expired MTVs or starting ${formatDateOnly(windowStart)}, two months before the current certificate expires on ${formatDateOnly(expiry)}.`,
    };
  }

  const issueDate = now > expiry ? now : addDays(expiry, 1);
  return {
    eligible: true,
    expiry,
    issueDate,
    nextExpiry: addYears(issueDate, 1),
  };
}

export async function validateRenewalApplication(application) {
  if (!isRenewalApplication(application)) return;

  const rows = await readSheet("Accredited");
  const existing = latestAccreditedByPlate(rows, application.plate);
  const window = renewalWindow(existing);

  if (!window.eligible) {
    throw new Error(window.error);
  }
}

export async function getRenewalPlateStatus(plate) {
  const rows = await readSheet("Accredited");
  const accredited = latestAccreditedByPlate(rows, plate);
  if (!accredited) {
    return {
      exists: false,
      eligible: false,
      error: "No accredited MTV record was found for this plate number.",
    };
  }

  const window = renewalWindow(accredited);
  return {
    exists: true,
    eligible: window.eligible,
    error: window.eligible ? "" : window.error,
    currentExpiry: window.expiry ? formatDateOnly(window.expiry) : "",
    nextIssueDate: window.issueDate ? formatDateOnly(window.issueDate) : "",
    nextExpiry: window.nextExpiry ? formatDateOnly(window.nextExpiry) : "",
  };
}

export async function getRenewalApplicationPrefill(plate) {
  const [applications, accreditedRows] = await Promise.all([
    readSheet("Applications"),
    readSheet("Accredited"),
  ]);
  const accredited = latestAccreditedByPlate(accreditedRows, plate);
  const window = renewalWindow(accredited);

  if (!window.eligible) {
    return {
      eligible: false,
      error: window.error,
    };
  }

  const application = latestApplicationByPlate(applications, plate) || {};

  return {
    eligible: true,
    currentExpiry: formatDateOnly(window.expiry),
    nextIssueDate: formatDateOnly(window.issueDate),
    nextExpiry: formatDateOnly(window.nextExpiry),
    data: {
      registeredOwner:
        application.registered_owner ||
        accredited?.owner ||
        accredited?.name_of_owner ||
        accredited?.applicant ||
        "",
      email: application.email || accredited?.email || "",
      contact: application.contact || accredited?.contact || accredited?.tel_no || "",
      address: application.address || accredited?.address || "",
      region: application.region || "III",
      province: application.province || "",
      ghpCertNumber: application.ghp_cert_number || accredited?.ghp_cert_number || "",
      plate: application.plate || accredited?.plate || accredited?.plate_no || plate || "",
      vtype: application.vtype || accredited?.vehicle_type || accredited?.vtype || "",
      vmake: application.vmake || "",
      vmodel: application.vmodel || "",
      vyear: application.vyear || "",
      vcolor: application.vcolor || "",
      vengine: application.vengine || "",
      vchassis: application.vchassis || "",
      crNumber: application.cr_number || "",
      orNumber: application.or_number || "",
      cooling: application.cooling || "",
      capacity: application.capacity || "",
      material: application.material || "",
      meatEstablishment:
        application.meat_establishment ||
        accredited?.establishment_name ||
        accredited?.business ||
        accredited?.business_name ||
        "",
      intendedRoute: application.intended_route || "",
      bname:
        application.bname ||
        accredited?.establishment_name ||
        accredited?.business ||
        accredited?.business_name ||
        "",
      btype:
        application.btype ||
        accredited?.establishment_type ||
        accredited?.business_type ||
        accredited?.type ||
        "",
      baddress: application.baddress || "",
    },
  };
}

export async function upsertAccreditedFromApplication(application) {
  await ensureHeaders("Accredited", ACCREDITED_HEADERS);

  const { headers, rows } = await readSheetWithRowNumbers("Accredited");
  if (!headers.length) {
    throw new Error("Accredited sheet is missing a header row.");
  }

  const normalizedRef = String(application.ref_number || "").trim().toUpperCase();
  const normalizedPlate = String(application.plate || "").trim().toUpperCase();
  const existingByPlate = latestAccreditedByPlate(rows, normalizedPlate);
  const existingByRef = rows.find((row) => {
    const rowRef = String(row.ref_number || row.registration_no || "").trim().toUpperCase();
    return normalizedRef && rowRef === normalizedRef;
  });
  const isRenewal = isRenewalApplication(application);
  const existing = isRenewal ? null : existingByRef || existingByPlate;
  const registrationSource = isRenewal ? existingByPlate : existing;

  const now = new Date();
  let issueDate = todayDateOnly();
  let expiry = addYears(issueDate, 1);

  if (isRenewal) {
    const window = renewalWindow(existingByPlate);
    if (!window.eligible) throw new Error(window.error);
    issueDate = window.issueDate;
    expiry = window.nextExpiry;
  }

  const registrationNo =
    existingRegistrationNumber(registrationSource) || nextRegistrationNumber(rows);
  const dateIssued = formatDateOnly(issueDate);
  const expiryDate = formatDateOnly(expiry);

  const valuesByHeader = {
    date_issued: dateIssued,
    name_of_owner: application.registered_owner || "",
    address: application.address || "",
    establishment_type: application.btype || "",
    establishment_name: application.bname || application.meat_establishment || "",
    plate_no: application.plate || "",
    registration_no: registrationNo,
    receipt_no:
      application.reference_number ||
      application.receipt_no ||
      application.receiptNo ||
      "",
    ref_number: registrationNo,
    reference: registrationNo,
    plate: application.plate || "",
    business: application.bname || application.meat_establishment || "",
    business_name: application.bname || application.meat_establishment || "",
    type: application.btype || "",
    vehicle_type: application.vtype || "",
    owner: application.registered_owner || "",
    applicant: application.registered_owner || "",
    expiry: expiryDate,
    expiry_date: expiryDate,
    expiration_date: expiryDate,
    valid_until: expiryDate,
    remarks: application.remarks || "",
    status: "Active",
    approved_at: isRenewal ? dateIssued : now.toISOString(),
    email: application.email || "",
    contact: application.contact || "",
    ghp_cert_number: application.ghp_cert_number || "",
  };

  const rowValues = headers.map((header) => valuesByHeader[header] ?? existing?.[header] ?? "");
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (existing) {
    const data = headers.flatMap((header, index) => {
      if (ACCREDITED_FORMULA_HEADERS.has(header)) return [];
      return [
        {
          range: `${quoteSheetName("Accredited")}!${columnLabel(index + 1)}${existing._rowNumber}`,
          values: [[rowValues[index]]],
        },
      ];
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data,
      },
    });
    return;
  }

  await appendAccreditedRow(headers, rowValues, valuesByHeader);
}

export async function updateAccreditedStatus(reference, status) {
  const allowedStatuses = new Set([
    "Active",
    "Inactive",
    "Suspended",
    "Revoked",
    "Expired",
    "Cancelled",
  ]);

  if (!allowedStatuses.has(status)) {
    throw new Error("Invalid accredited MTV status.");
  }

  await ensureHeaders("Accredited", ACCREDITED_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Accredited");
  const statusIndex = headers.indexOf("status");
  if (statusIndex < 0) throw new Error("Accredited sheet is missing a status column.");

  const normalizedRef = String(reference || "").trim().toUpperCase();
  if (!normalizedRef) throw new Error("Registration number is required.");

  const row = rows.find((item) => {
    const candidates = [
      item.registration_no,
      item.ref_number,
      item.reference,
      item.plate_no,
      item.plate,
      item.plate_number,
    ];

    return candidates.some(
      (candidate) => String(candidate || "").trim().toUpperCase() === normalizedRef,
    );
  });

  if (!row) throw new Error("Accredited MTV record not found.");

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheetName("Accredited")}!${columnLabel(statusIndex + 1)}${row._rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });

  return {
    ...row,
    previousStatus: row.status || "Active",
    status,
  };
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
