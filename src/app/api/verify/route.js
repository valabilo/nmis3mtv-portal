/**
 * app/api/verify/route.js
 * Verifies vehicle status
 */

import { NextResponse } from "next/server";
import { getAccreditedList, getBannedList } from "@/lib/googleSheets";

function normalize(value) {
  return String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }

  return "";
}

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

    const normalizedPlate = normalize(plate);
    const [bannedList, accreditedList] = await Promise.all([
      getBannedList(),
      getAccreditedList(),
    ]);

    const isBanned = bannedList.some(
      (item) => normalize(item.plate || item.plate_no || item.plate_number) === normalizedPlate,
    );
    const accredited = accreditedList.find(
      (item) => normalize(item.plate || item.plate_no || item.plate_number) === normalizedPlate,
    );
    const accreditedStatus = firstValue(accredited || {}, ["status"]) || "Active";
    const status = isBanned ? "Banned" : accredited ? accreditedStatus : "Not Found";

    return NextResponse.json(
      {
        success: true,
        plate,
        status,
        isBanned,
        isAccredited: Boolean(accredited),
        registrationNo: firstValue(accredited || {}, [
          "registration_no",
          "ref_number",
          "reference",
        ]),
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
