import { google } from "googleapis";
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
 * If headers are missing or out of order, they are written/updated.
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

  const legacyApplicationHeaders = new Set([
    "firstname",
    "lastname",
    "middlename",
    "suffix",
    "owner_name_on_cr",
    "operator_name",
    "business_tin",
    // legacy fields removed from form
    "body_type",
    "fuel_type",
    "gross_weight",
    "net_capacity",
    "lto_client_id",
  ]);

  const legacySheetHeaders = new Set(
    sheetName === "Accredited" ? ["VALIDITY"] : [],
  );

  const normalizedExpectedHeaders = new Set(expectedHeaders);
  const customHeaders = currentHeaders.filter(
    (header) =>
      header &&
      !normalizedExpectedHeaders.has(header) &&
      !legacyApplicationHeaders.has(header) &&
      !legacySheetHeaders.has(header),
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

export async function getGHPCompletions() {
  return readSheet("GHP_Completions");
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

  return (
    rows.find(
      (row) =>
        String(row.reference_number || "").trim().toUpperCase() === normalizedRef,
    ) || null
  );
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
 * meat_establishment | intended_route
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
  "status_history",
  "amendment_ref",
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
  "Payment Reference Number",
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
    status_history: statusHistory,
    amendment_ref: data.amendmentRef ?? existing.amendment_ref ?? "",
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
  ]);

  if (!allowedStatuses.has(status)) {
    throw new Error("Invalid application status.");
  }

  await ensureHeaders("Applications", APPLICATION_HEADERS);
  const { headers, rows } = await readSheetWithRowNumbers("Applications");
  const statusIndex = headers.indexOf("status");
  if (statusIndex < 0) throw new Error("Applications sheet is missing a status column.");
  const remarksIndex = headers.indexOf("remarks");
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
      const paymentRow = paymentSheet.rows.find(
        (item) =>
          String(item.reference_number || "").trim().toUpperCase() === normalizedRef,
      );
      if (paymentRow) {
        const verifiedIndex = paymentSheet.headers.indexOf("payment_verified_at");
        const sourceIndex = paymentSheet.headers.indexOf("verification_source");
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
      }
    } catch (error) {
      console.error("Online Payment verification timestamp failed:", error);
    }
  }

  return updated;
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

  const existing = rows.find(
    (row) =>
      String(row.reference_number || "").trim().toUpperCase() === normalizedRef,
  );
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
    reference_number: normalizedRef,
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
  const existing = rows.find(
    (row) =>
      String(row.reference_number || "").trim().toUpperCase() === normalizedRef,
  );
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
    reference_number: normalizedRef,
    date_of_payment: existing?.date_of_payment || dateOfPayment,
    payment_reference_number: normalizedPaymentReference,
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

export async function upsertAccreditedFromApplication(application) {
  await ensureHeaders("Accredited", ACCREDITED_HEADERS);

  const { headers, rows } = await readSheetWithRowNumbers("Accredited");
  if (!headers.length) {
    throw new Error("Accredited sheet is missing a header row.");
  }

  const normalizedRef = String(application.ref_number || "").trim().toUpperCase();
  const normalizedPlate = String(application.plate || "").trim().toUpperCase();
  const existing = rows.find((row) => {
    const rowRef = String(row.ref_number || row.registration_no || "").trim().toUpperCase();
    const rowPlate = String(row.plate || row.plate_no || row.plate_number || "")
      .trim()
      .toUpperCase();

    return (normalizedRef && rowRef === normalizedRef) || (normalizedPlate && rowPlate === normalizedPlate);
  });

  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(now.getFullYear() + 1);
  const registrationNo = existingRegistrationNumber(existing) || nextRegistrationNumber(rows);

  const valuesByHeader = {
    date_issued: now.toISOString().slice(0, 10),
    name_of_owner: application.registered_owner || "",
    address: application.address || "",
    establishment_type: application.btype || "",
    establishment_name: application.bname || application.meat_establishment || "",
    plate_no: application.plate || "",
    registration_no: registrationNo,
    expiry: expiry.toISOString().slice(0, 10),
    receipt_no: "",
    validity: "",
    valid: "",
    status: "Active",
    ref_number: registrationNo,
    reference: registrationNo,
    plate: application.plate || "",
    business: application.bname || application.meat_establishment || "",
    business_name: application.bname || application.meat_establishment || "",
    type: application.btype || "",
    vehicle_type: application.vtype || "",
    owner: application.registered_owner || "",
    applicant: application.registered_owner || "",
    expiry: expiry.toISOString().slice(0, 10),
    expiry_date: expiry.toISOString().slice(0, 10),
    expiration_date: expiry.toISOString().slice(0, 10),
    valid_until: expiry.toISOString().slice(0, 10),
    status: "Active",
    approved_at: now.toISOString(),
    email: application.email || "",
    contact: application.contact || "",
    ghp_cert_number: application.ghp_cert_number || "",
    remarks: "",
  };

  const rowValues = headers.map((header) => valuesByHeader[header] ?? existing?.[header] ?? "");
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetName("Accredited")}!A${existing._rowNumber}:${columnLabel(headers.length)}${existing._rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });
    return;
  }

  await appendRow("Accredited", rowValues);
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
