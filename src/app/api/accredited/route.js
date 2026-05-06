/**
 * app/api/accredited/route.js
 * Returns the list of accredited MTVs from Google Sheets.
 */

import { NextResponse } from "next/server";
import { getAccreditedList } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAccreditedList();
    return NextResponse.json(
      { success: true, data, count: data.length },
      { status: 200 },
    );
  } catch (error) {
    console.error("Accredited list fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch accredited list",
        data: [],
      },
      { status: 500 },
    );
  }
}
