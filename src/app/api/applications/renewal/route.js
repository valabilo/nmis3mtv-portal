import { NextResponse } from "next/server";
import {
  getRenewalApplicationPrefill,
  getRenewalPlateStatus,
} from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const plate = request.nextUrl.searchParams.get("plate") || "";
    if (!plate.trim()) {
      return NextResponse.json(
        { success: false, error: "Plate number is required." },
        { status: 400 },
      );
    }

    if (request.nextUrl.searchParams.get("mode") === "status") {
      const status = await getRenewalPlateStatus(plate);
      const httpStatus = !status.exists ? 404 : status.eligible ? 200 : 409;
      return NextResponse.json(
        { success: status.exists && status.eligible, ...status },
        { status: httpStatus },
      );
    }

    const renewal = await getRenewalApplicationPrefill(plate);
    if (!renewal.eligible) {
      return NextResponse.json(
        { success: false, error: renewal.error },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      ...renewal,
    });
  } catch (error) {
    console.error("Renewal prefill error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to load renewal record.",
      },
      { status: 500 },
    );
  }
}
