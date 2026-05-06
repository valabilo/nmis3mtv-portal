/**
 * app/api/verify/route.js
 * Verifies vehicle status
 */

import { NextResponse } from "next/server";
import { getBannedList } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    const body = await request.json();
    const { plate } = body;

    if (!plate) {
      return NextResponse.json(
        { success: false, error: "Plate number is required" },
        { status: 400 },
      );
    }

    // Get banned list
    const bannedList = await getBannedList();

    // Check if vehicle is banned
    const isBanned = bannedList.some(
      (item) => item.plate?.toUpperCase() === plate.toUpperCase(),
    );

    return NextResponse.json(
      {
        success: true,
        plate,
        status: isBanned ? "Banned" : "Verified",
        isBanned,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Verification failed",
      },
      { status: 500 },
    );
  }
}
