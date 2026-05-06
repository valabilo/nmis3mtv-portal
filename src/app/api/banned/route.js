/**
 * app/api/banned/route.js
 * Returns list of banned vehicles
 */

import { NextResponse } from "next/server";
import { getBannedList } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bannedList = await getBannedList();

    return NextResponse.json(
      {
        success: true,
        data: bannedList,
        count: bannedList.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Banned list fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch banned list",
      },
      { status: 500 },
    );
  }
}
