import { NextResponse } from "next/server";
import { getOnlinePaymentRecord, readSheet } from "@/lib/googleSheets";
import {
  generateOrderOfPaymentPdf,
  orderOfPaymentFilename,
} from "@/lib/orderOfPayment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = (searchParams.get("ref") || "").trim().toUpperCase();

    if (!ref) {
      return NextResponse.json(
        { success: false, error: "Reference number is required." },
        { status: 400 },
      );
    }

    const rows = await readSheet("Applications");
    const row = rows.find(
      (item) => String(item.ref_number || "").trim().toUpperCase() === ref,
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Application not found." },
        { status: 404 },
      );
    }

    if (!["For Payment", "Rejected Proof of Payment"].includes(String(row.status || "").trim())) {
      return NextResponse.json(
        { success: false, error: "Order of Payment is only available for applications awaiting payment." },
        { status: 400 },
      );
    }

    const onlinePayment = await getOnlinePaymentRecord(row.ref_number);
    const statusUrl = `${request.nextUrl.origin}/application-status?ref=${encodeURIComponent(row.ref_number)}&payment=1`;
    const pdf = await generateOrderOfPaymentPdf(row, onlinePayment || {}, {
      statusUrl,
    });
    const filename = orderOfPaymentFilename(row.ref_number);

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Order of Payment generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate Order of Payment.",
      },
      { status: 500 },
    );
  }
}
