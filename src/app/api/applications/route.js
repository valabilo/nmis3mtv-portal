/**
 * app/api/applications/route.js
 * Handles MTV application submissions.
 */

import { NextResponse } from "next/server";
import { generateRefNumber } from "@/lib/refNumber";
import { readSheet, saveApplication } from "@/lib/googleSheets";
import { createApplicationFolder, uploadFileToDrive } from "@/lib/driveService";
import { sendApplicationConfirmation } from "@/lib/sendMail";
import {
  APPLICATION_FIELDS,
  safeDriveName,
  sanitizeApplicationFields,
  validateApplicationFields,
  validateApplicationFiles,
} from "@/lib/applicationSecurity";

export const runtime = "nodejs";

const activeSubmissions = globalThis.__mtvActiveSubmissions ?? new Set();
globalThis.__mtvActiveSubmissions = activeSubmissions;

function jsonError(error, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

async function fileToBuffer(file) {
  return Buffer.from(await file.arrayBuffer());
}

function normalizeControlNo(value) {
  return String(value || "").trim().toUpperCase();
}

function sheetValue(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }

  return "";
}

function isExpired(value) {
  if (!value) return false;

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return today > expiry;
}

async function validateOptionalGhpControlNo(controlNo) {
  const id = normalizeControlNo(controlNo);
  if (!id) return "";

  const rows = await readSheet("Certificate Issuance");
  const row = rows.find((item) => {
    const rowControlNo = normalizeControlNo(
      sheetValue(item, ["control_no", "control_number", "cert_number", "certificate_no"]),
    );

    return rowControlNo === id;
  });

  if (!row) return "The GHP certificate control number is not valid.";

  const expiryDate = sheetValue(row, ["expiry_date", "valid_until", "expiration_date"]);
  if (isExpired(expiryDate)) return "The GHP certificate control number is expired.";

  return "";
}

export async function POST(request) {
  let submissionId = "";

  try {
    const form = await request.formData();
    const rawFields = {};
    APPLICATION_FIELDS.forEach((field) => {
      rawFields[field] = form.get(field) ?? "";
    });

    const body = sanitizeApplicationFields(rawFields);
    submissionId = body.submissionId;

    if (submissionId) {
      if (activeSubmissions.has(submissionId)) {
        return jsonError("This application is already being submitted. Please wait for the result.", 409);
      }
      activeSubmissions.add(submissionId);
    }

    const fieldError = validateApplicationFields(body);
    if (fieldError) return jsonError(fieldError);

    const ghpError = await validateOptionalGhpControlNo(body.ghpCertNumber);
    if (ghpError) return jsonError(`${ghpError} Leave it blank or enter a valid control number.`);

    const documents = {};
    for (const [key, value] of form.entries()) {
      if (!key.startsWith("document:")) continue;
      const docId = key.slice("document:".length);
      if (value && typeof value === "object" && "arrayBuffer" in value) {
        documents[docId] = value;
      }
    }

    const fileError = validateApplicationFiles(documents);
    if (fileError) return jsonError(fileError);

    const refNumber = generateRefNumber();
    const folderName = safeDriveName(`MTV-${refNumber}_${body.registeredOwner}`);
    const folderId = await createApplicationFolder(folderName);

    await Promise.all(
      Object.entries(documents).map(async ([docId, file]) => {
        const buffer = await fileToBuffer(file);
        const fileName = safeDriveName(`${refNumber}_${docId}_${file.name}`);

        return uploadFileToDrive({
          fileName,
          mimeType: file.type,
          buffer,
          folderId,
        });
      }),
    );

    const applicationData = {
      ...body,
      refNumber,
      driveFolderId: folderId,
    };

    await saveApplication(applicationData);

    let emailSent = false;
    try {
      await sendApplicationConfirmation(
        body.email,
        refNumber,
        body.registeredOwner,
      );
      emailSent = true;
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully",
        refNumber,
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Application submission error:", error);
    return jsonError(error.message || "Failed to submit application", 500);
  } finally {
    if (submissionId) activeSubmissions.delete(submissionId);
  }
}
