import { NextResponse } from "next/server";
import {
  createBannedRecord,
  getApplicationByRef,
  getAccreditedList,
  getApplications,
  getBannedList,
  getCertificateIssuance,
  getGHPCompletions,
  upsertAccreditedFromApplication,
  upsertOnlinePaymentFromApplication,
  updateAccreditedStatus,
  updateApplicationDocumentReview,
  updateApplicationStatus,
} from "@/lib/googleSheets";
import { listFolderFiles } from "@/lib/driveService";
import {
  sendApplicationStatusUpdateToApplicant,
  sendApplicationStatusUpdateToNMIS,
} from "@/lib/sendMail";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { accreditedStatusForRow } from "@/lib/accreditedStatus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeApplication(row) {
  const folderId = row.drive_folder_id || "";
  let statusHistory = [];
  let documentReview = {};

  try {
    statusHistory = row.status_history ? JSON.parse(row.status_history) : [];
  } catch {
    statusHistory = [];
  }

  if (!statusHistory.length) {
    statusHistory = [
      {
        status: row.status || "Application Received",
        remarks: row.remarks || "",
        timestamp: row.timestamp || "",
      },
    ];
  }

  try {
    documentReview = row.document_review ? JSON.parse(row.document_review) : {};
  } catch {
    documentReview = {};
  }

  return {
    reference: row.ref_number || "",
    timestamp: row.timestamp || "",
    applicationType: row.application_type || "",
    registeredOwner: row.registered_owner || "",
    email: row.email || "",
    contact: row.contact || "",
    address: row.address || "",
    region: row.region || "",
    province: row.province || "",
    ghpCertNumber: row.ghp_cert_number || "",
    plate: row.plate || "",
    vehicleType: row.vtype || "",
    vehicleMake: row.vmake || "",
    vehicleModel: row.vmodel || "",
    vehicleYear: row.vyear || "",
    capacity: row.capacity || "",
    businessName: row.bname || "",
    businessType: row.btype || "",
    businessAddress: row.baddress || "",
    status: row.status || "Application Received",
    remarks: row.remarks || "",
    statusHistory,
    folderId,
    folderUrl: folderId ? `https://drive.google.com/drive/folders/${folderId}` : "",
    vehicleColor: row.vcolor || "",
    engineNumber: row.vengine || "",
    chassisNumber: row.vchassis || "",
    crNumber: row.cr_number || "",
    orNumber: row.or_number || "",
    receiptNo: row.reference_number || row.receipt_no || "",
    coolingSystem: row.cooling || "",
    material: row.material || "",
    meatEstablishment: row.meat_establishment || "",
    intendedRoute: row.intended_route || "",
    documents: [],
    documentReview,
  };
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

async function validateCompletionRequirements(reference) {
  const application = await getApplicationByRef(reference);
  if (!application) throw new Error("Application not found.");

  if (String(application.status || "").trim() !== "Payment Verified") {
    throw new Error("Status can only be changed to Completed after Payment Verified.");
  }

  const folderId = application.drive_folder_id || "";
  if (!folderId) return;

  let documents = [];
  try {
    documents = await listFolderFiles(folderId);
  } catch (error) {
    console.error("Completion document validation failed:", error);
    throw new Error("Documents could not be verified before completing this application.");
  }

  const documentReview = parseDocumentReview(application.document_review);
  const blockedDocuments = documents.filter((document) => {
    const reviewStatus = String(documentReview?.[document.id]?.status || "").trim();
    return reviewStatus !== "Approved";
  });

  if (blockedDocuments.length) {
    throw new Error(
      "Status cannot be changed to Completed while documents are pending or rejected.",
    );
  }
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }

  return "";
}

function normalizeAccredited(row) {
  return {
    reference: firstValue(row, ["ref_number", "reference", "registration_no"]),
    plate: firstValue(row, ["plate", "plate_no", "plate_number"]),
    business: firstValue(row, ["business", "business_name", "bname", "establishment_name"]),
    type: firstValue(row, ["establishment_type", "business_type", "type", "vehicle_type", "vtype"]),
    owner: firstValue(row, ["owner", "applicant", "registered_owner", "name", "name_of_owner"]),
    address: firstValue(row, ["address"]),
    telNo: firstValue(row, ["tel_no", "telephone_no", "contact", "phone"]),
    expiry: firstValue(row, ["expiry", "expiry_date", "expiration_date", "valid_until"]),
    validity: firstValue(row, ["validity", "valid"]),
    stickerNo: firstValue(row, ["sticker_no", "sticker_number"]),
    receiptDate: firstValue(row, ["receipt_date", "or_date"]),
    receiptNo: firstValue(row, ["receipt_no", "receipt_number", "or_number"]),
    remarks: firstValue(row, ["remarks"]),
    status: accreditedStatusForRow(row),
    approvedAt: firstValue(row, ["approved_at", "timestamp", "date", "date_issued"]),
  };
}

function normalizeBanned(row) {
  return {
    plate: firstValue(row, ["plate", "plate_no", "plate_number"]),
    business: firstValue(row, ["business", "business_name", "bname"]),
    owner: firstValue(row, ["owner", "applicant", "name", "operator", "proprietor"]),
    reason: firstValue(row, ["reason", "violation", "remarks"]),
    date: firstValue(row, ["date", "date_banned", "banned_date", "timestamp"]),
    status: firstValue(row, ["status"]) || "Banned",
  };
}

function isInYear(value, year) {
  if (!value) return false;

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear() === year;

  return String(value).includes(String(year));
}

function hasIssuedCertificate(row) {
  return Boolean(
    String(
      firstValue(row, [
        "certificate_number",
        "control_no",
        "cert_number",
        "certificate_no",
        "controlNumber",
      ]) || "",
    ).trim(),
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Dashboard login required." },
    { status: 401 },
  );
}

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return unauthorizedResponse();

  try {
    const [rowsResult, accreditedResult, bannedResult, ghpResult] = await Promise.allSettled([
      getApplications(),
      getAccreditedList(),
      getBannedList(),
      getCertificateIssuance(),
    ]);
    if (rowsResult.status === "rejected") throw rowsResult.reason;

    const rows = rowsResult.value;
    const accreditedRows =
      accreditedResult.status === "fulfilled" ? accreditedResult.value : [];
    const bannedRows =
      bannedResult.status === "fulfilled" ? bannedResult.value : [];
    let ghpRows = ghpResult.status === "fulfilled" ? ghpResult.value : [];
    if (ghpResult.status === "rejected") {
      try {
        ghpRows = await getGHPCompletions();
      } catch (error) {
        console.error("GHP certificate stats fallback failed:", error);
        ghpRows = [];
      }
    }
    const applications = await Promise.all(
      rows.map(async (row) => {
        const application = normalizeApplication(row);

        if (!application.folderId) return application;

        try {
          application.documents = (await listFolderFiles(application.folderId)).map(
            (document) => ({
              ...document,
              review: application.documentReview?.[document.id] || null,
              reviewStatus: application.documentReview?.[document.id]?.status || "",
            }),
          );
        } catch (error) {
          console.error("Admin document listing error:", error);
          application.documentsError = "Documents could not be loaded.";
        }

        return application;
      }),
    );

    applications.sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );

    const accredited = accreditedRows.map(normalizeAccredited);
    const banned = bannedRows.map(normalizeBanned);
    const ghpCertificates = ghpRows
      .filter((row) => hasIssuedCertificate(row))
      .map((row) => ({
        controlNo: firstValue(row, ["control_no", "certificate_number", "cert_number", "certificate_no", "controlNumber"]),
        issuedAt: firstValue(row, ["exam_date", "date_issued", "issued_date", "completed_at", "timestamp", "certificate_issued_at"]),
        status: firstValue(row, ["status", "result", "exam_result"]) || "PASSED",
      }));
    const currentYear = new Date().getFullYear();
    const ghpIssuedThisYear = ghpRows.filter(
      (row) => hasIssuedCertificate(row) && isInYear(
        firstValue(row, [
          "exam_date",
          "date_issued",
          "issued_date",
          "completed_at",
          "timestamp",
          "expiry_date",
          "certificate_issued_at",
        ]),
        currentYear,
      ),
    ).length;
    const accreditedThisYear = accredited.filter((row) =>
      isInYear(row.approvedAt, currentYear),
    ).length;

    return NextResponse.json({
      success: true,
      data: applications,
      accredited,
      banned,
      ghpCertificates,
      stats: {
        year: currentYear,
        accreditedTotal: accredited.length,
        accreditedThisYear,
        ghpIssuedThisYear,
      },
      count: applications.length,
    });
  } catch (error) {
    console.error("Admin applications fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load applications.",
        data: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!requestHasDashboardSession(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const action = String(body.action || "").trim();

    if (action !== "create-banned") {
      return NextResponse.json(
        { success: false, error: "Unsupported admin action." },
        { status: 400 },
      );
    }

    const banned = normalizeBanned(
      await createBannedRecord({
        plate: body.plate,
        business: body.business,
        owner: body.owner,
        reason: body.reason,
        date: body.date,
        status: body.status,
      }),
    );

    return NextResponse.json({
      success: true,
      banned,
    });
  } catch (error) {
    console.error("Admin create banned MTV error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add banned MTV.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  if (!requestHasDashboardSession(request)) return unauthorizedResponse();

  try {
    const siteUrl = request.nextUrl.origin;
    const body = await request.json();
    const reference = String(body.reference || "").trim();
    const status = String(body.status || "").trim();
    const remarks = String(body.remarks || "").trim();
    const target = String(body.target || "application").trim().toLowerCase();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Reference number is required." },
        { status: 400 },
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status is required." },
        { status: 400 },
      );
    }

    if (target === "accredited") {
      const updated = await updateAccreditedStatus(reference, status);

      return NextResponse.json({
        success: true,
        accredited: normalizeAccredited(updated),
        effects: {
          accredited: true,
          onlinePayment: null,
          applicantEmail: false,
          nmisEmail: false,
          errors: [],
        },
      });
    }

    if (target === "document") {
      const documentId = String(body.documentId || "").trim();
      const documentName = String(body.documentName || "").trim();
      const updated = await updateApplicationDocumentReview({
        refNumber: reference,
        documentId,
        documentName,
        status,
      });

      return NextResponse.json({
        success: true,
        application: normalizeApplication(updated),
        documentReview: JSON.parse(updated.document_review || "{}"),
        effects: {
          documentReview: true,
          errors: [],
        },
      });
    }

    if (status === "Completed") {
      await validateCompletionRequirements(reference);
    }

    const updated = await updateApplicationStatus(reference, status, remarks);
    const application = normalizeApplication(updated);
    application.previousStatus = updated.previousStatus || "Application Received";

    const effects = {
      accredited: status !== "Completed" ? null : false,
      onlinePayment: status !== "For Payment" ? null : false,
      applicantEmail: false,
      nmisEmail: false,
      errors: [],
    };

    if (status === "Completed") {
      try {
        await upsertAccreditedFromApplication(updated);
        effects.accredited = true;
      } catch (syncError) {
        console.error("Accredited sync failed:", syncError);
        effects.errors.push(
          `Accredited sync failed: ${syncError.message || "Unknown error"}`,
        );
      }
    }

    if (status === "For Payment") {
      try {
        application.onlinePayment = await upsertOnlinePaymentFromApplication(updated);
        effects.onlinePayment = true;
      } catch (syncError) {
        console.error("Online Payment sync failed:", syncError);
        effects.errors.push(
          `Online Payment sync failed: ${syncError.message || "Unknown error"}`,
        );
      }
    }

    if (status !== "Under Review") {
      try {
        await sendApplicationStatusUpdateToApplicant({ ...application, siteUrl });
        effects.applicantEmail = true;
      } catch (emailError) {
        console.error("Applicant status update email failed:", emailError);
        effects.errors.push(
          `Applicant email failed: ${emailError.message || "Unknown error"}`,
        );
      }
    }

    try {
      await sendApplicationStatusUpdateToNMIS(application);
      effects.nmisEmail = true;
    } catch (emailError) {
      console.error("NMIS status update email failed:", emailError);
      effects.errors.push(`NMIS email failed: ${emailError.message || "Unknown error"}`);
    }

    return NextResponse.json({
      success: true,
      application,
      effects,
      email: {
        applicant: effects.applicantEmail,
        nmis: effects.nmisEmail,
        errors: effects.errors.filter((item) => item.includes("email")),
      },
    });
  } catch (error) {
    console.error("Admin application status update error:", error);
    const notFoundErrors = ["Application not found.", "Accredited MTV record not found."];
    const validationErrors = [
      "Status can only be changed to Completed after Payment Verified.",
      "Documents could not be verified before completing this application.",
      "Status cannot be changed to Completed while documents are pending or rejected.",
    ];

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update application status.",
      },
      {
        status: notFoundErrors.includes(error.message)
          ? 404
          : validationErrors.includes(error.message)
            ? 400
            : 500,
      },
    );
  }
}
