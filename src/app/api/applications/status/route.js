/**
 * app/api/applications/status/route.js
 * GET /api/applications/status?ref=MTV-YYYY-XXXXX
 */

import { NextResponse } from "next/server";
import { getOnlinePaymentRecord, readSheet } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = (searchParams.get("ref") || "").trim().toUpperCase();

    if (!ref) {
      return NextResponse.json(
        { success: false, error: "Reference number is required" },
        { status: 400 },
      );
    }

    const rows = await readSheet("Applications");

    // Sheet columns (0-based after header normalisation by readSheet):
    // ref_number | timestamp | application_type | registered_owner | email | contact |
    // address | province | plate | vtype | vmake | vmodel | vyear |
    // capacity | bname | btype | baddress | drive_folder_id | status
    const row = rows.find(
      (r) => (r.ref_number || "").toString().trim().toUpperCase() === ref,
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 },
      );
    }

    const submittedAt = row.timestamp
      ? new Date(row.timestamp).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

    const onlinePayment = await getOnlinePaymentRecord(row.ref_number);
    const onlinePaymentReference = String(onlinePayment?.reference_number || "").trim();
    const legacyPaymentReference = String(
      onlinePayment?.payment_reference_number ||
        onlinePayment?.payment_ref_number ||
        "",
    ).trim();
    const paymentReference =
      onlinePaymentReference &&
      onlinePaymentReference.toUpperCase() !== row.ref_number.toUpperCase()
        ? onlinePaymentReference
        : legacyPaymentReference;

    return NextResponse.json({
      success: true,
      application: {
        reference: row.ref_number,
        applicant: row.registered_owner || row.registeredowner || "",
        email: row.email,
        contact: row.contact,
        business: row.bname,
        plate: row.plate,
        vehicleType: row.vtype,
        status: row.status || "Application Received",
        submittedAt,
        remarks: row.remarks || "",
        receiptNo: row.reference_number || row.receipt_no || "",
        folderId: row.drive_folder_id || "",
        paymentReference,
        paymentSubmittedAt: onlinePayment?.payment_submitted_at || "",
        proofOfPaymentFileName: onlinePayment?.proof_of_payment_file_name || "",
        orderOfPaymentUrl:
          ["For Payment", "Rejected Proof of Payment"].includes(row.status)
            ? `/api/applications/order-of-payment?ref=${encodeURIComponent(row.ref_number)}`
            : "",
      },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch application status",
      },
      { status: 500 },
    );
  }
}
