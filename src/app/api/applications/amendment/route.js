import { NextResponse } from "next/server";
import { getApplicationByRef } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStatusHistory(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasSubmittedAmendment(row) {
  const history = parseStatusHistory(row.status_history);
  const latest = history[history.length - 1] || {};
  const status = String(row.status || "").trim().toLowerCase();
  const remarks = String(latest.remarks || row.remarks || "").trim().toLowerCase();

  return status === "application received" && remarks.includes("amendment submitted");
}

function isAmendmentOpen(row) {
  const status = String(row.status || "").trim().toLowerCase();
  return status === "rejected application";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = String(searchParams.get("ref") || "").trim().toUpperCase();

    if (!ref) {
      return NextResponse.json(
        { success: false, error: "Reference number is required." },
        { status: 400 },
      );
    }

    const row = await getApplicationByRef(ref);
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Application not found." },
        { status: 404 },
      );
    }

    if (!isAmendmentOpen(row) || hasSubmittedAmendment(row)) {
      return NextResponse.json(
        {
          success: false,
          code: "AMENDMENT_ALREADY_SUBMITTED",
          error:
            "The record has been amended and already submitted. Please wait for NMIS to verify the record.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        reference: row.ref_number || ref,
        applicationType: "Amendment",
        registeredOwner: row.registered_owner || "",
        email: row.email || "",
        contact: row.contact || "",
        address: row.address || "",
        region: row.region || "III",
        province: row.province || "",
        ghpCertNumber: row.ghp_cert_number || "",
        plate: row.plate || "",
        vtype: row.vtype || "",
        vmake: row.vmake || "",
        vmodel: row.vmodel || "",
        vyear: row.vyear || "",
        vcolor: row.vcolor || "",
        vengine: row.vengine || "",
        vchassis: row.vchassis || "",
        crNumber: row.cr_number || "",
        orNumber: row.or_number || "",
        cooling: row.cooling || "",
        capacity: row.capacity || "",
        material: row.material || "",
        meatEstablishment: row.meat_establishment || row.bname || "",
        intendedRoute: row.intended_route || row.baddress || "",
        bname: row.bname || "",
        btype: row.btype || "",
        baddress: row.baddress || "",
        folderId: row.drive_folder_id || "",
      },
    });
  } catch (error) {
    console.error("Amendment lookup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load amendment details.",
      },
      { status: 500 },
    );
  }
}
