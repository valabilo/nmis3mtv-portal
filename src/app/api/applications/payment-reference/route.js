import { NextResponse } from "next/server";
import { recordApplicantPaymentReference } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const reference = String(body.reference || "").trim().toUpperCase();
    const paymentReference = String(body.paymentReference || "").trim();
    const proofFileId = String(body.proofFileId || "").trim();
    const proofFileName = String(body.proofFileName || "").trim();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Application reference number is required." },
        { status: 400 },
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        { success: false, error: "Payment reference number is required." },
        { status: 400 },
      );
    }

    if (paymentReference.length < 5) {
      return NextResponse.json(
        { success: false, error: "Enter a valid payment reference number." },
        { status: 400 },
      );
    }

    if (!proofFileId || !proofFileName) {
      return NextResponse.json(
        { success: false, error: "Proof of payment upload is required." },
        { status: 400 },
      );
    }

    const result = await recordApplicantPaymentReference(reference, paymentReference, {
      fileId: proofFileId,
      fileName: proofFileName,
    });

    return NextResponse.json({
      success: true,
      status: result.application.status || "For Payment Verification",
      paymentReference: result.onlinePayment.payment_reference_number || paymentReference,
      proofFileName: result.onlinePayment.proof_of_payment_file_name || proofFileName,
      message: "Proof of payment submitted for NMIS verification.",
    });
  } catch (error) {
    console.error("Payment reference submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit proof of payment.",
      },
      { status: error.message === "Application not found." ? 404 : 500 },
    );
  }
}
