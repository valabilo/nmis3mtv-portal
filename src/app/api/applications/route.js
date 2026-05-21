/**
 * app/api/applications/route.js
 *
 * Handles MTV application submissions.
 *
 * NEW FLOW (bypasses Vercel 4.5MB payload limit):
 *   1. Browser calls POST /api/drive/create-folder  → gets folderId
 *   2. For each file, browser calls POST /api/drive/upload-url → gets resumable URL
 *   3. Browser uploads each file DIRECTLY to Google Drive via the resumable URL
 *   4. Browser calls POST /api/applications with JSON metadata + folderId + fileIds
 *      (no binary data — tiny payload, no Vercel size limit hit)
 */

import { NextResponse } from "next/server";
import {
  saveApplication,
  updateApplication,
  validateRenewalApplication,
} from "@/lib/googleSheets";
import { deleteReplacedApplicationFiles } from "@/lib/driveService";
import {
  sendApplicationConfirmation,
  sendApplicationNotificationToNMIS,
} from "@/lib/sendMail";
import {
  sanitizeApplicationFields,
  validateApplicationFields,
} from "@/lib/applicationSecurity";

export const runtime = "nodejs";

const activeSubmissions = globalThis.__mtvActiveSubmissions ?? new Set();
globalThis.__mtvActiveSubmissions = activeSubmissions;

function jsonError(error, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request) {
  let submissionId = "";

  try {
    const body = await request.json();
    const siteUrl = request.nextUrl.origin;

    submissionId = String(body.submissionId || "");

    if (submissionId) {
      if (activeSubmissions.has(submissionId)) {
        return jsonError(
          "This application is already being submitted. Please wait.",
          409,
        );
      }
      activeSubmissions.add(submissionId);
    }

    // Sanitize and validate form fields
    const sanitized = sanitizeApplicationFields(body);
    const fieldError = validateApplicationFields(sanitized);
    if (fieldError) return jsonError(fieldError);

    // folderId was created client-side before uploading files directly to Drive
    const folderId = String(body.folderId || "").trim();
    if (!folderId) {
      return jsonError("Missing folderId. Files must be uploaded first.");
    }

    // Optional: list of uploaded file names for the notification email
    const uploadedFiles = Array.isArray(body.uploadedFiles)
      ? body.uploadedFiles
      : [];

    // Get refNumber from client (generated sequentially before folder creation)
    const refNumber = String(body.refNumber || "").trim();
    if (!refNumber) {
      return jsonError(
        "Missing refNumber. Reference number must be generated first.",
      );
    }

    const isAmendment =
      sanitized.applicationType === "Amendment" || Boolean(sanitized.amendmentRef);

    if (sanitized.applicationType === "Renewal") {
      await validateRenewalApplication(sanitized);
    }

    const applicationData = {
      ...sanitized,
      refNumber,
      driveFolderId: folderId,
      amendmentRef: isAmendment ? refNumber : sanitized.amendmentRef,
    };

    if (isAmendment) {
      const amendedDocIds = uploadedFiles.map((file) => file.docId).filter(Boolean);
      const uploadedFileIds = uploadedFiles.map((file) => file.fileId).filter(Boolean);

      if (amendedDocIds.length) {
        await deleteReplacedApplicationFiles({
          folderId,
          refNumber,
          docIds: amendedDocIds,
          keepFileIds: uploadedFileIds,
        });
      }

      await updateApplication(applicationData);
    } else {
      await saveApplication(applicationData);
    }

    // Send confirmation email to applicant
    let emailSent = false;
    try {
      await sendApplicationConfirmation(
        sanitized.email,
        refNumber,
        sanitized.registeredOwner,
        { siteUrl },
      );
      emailSent = true;
    } catch (emailError) {
      console.error("Applicant confirmation email failed:", emailError);
    }

    // Send notification email to NMIS
    try {
      await sendApplicationNotificationToNMIS({
        ...sanitized,
        refNumber,
        uploadedFiles,
        siteUrl,
      });
    } catch (emailError) {
      console.error("NMIS notification email failed:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: isAmendment
          ? "Application amendment submitted successfully"
          : "Application submitted successfully",
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
