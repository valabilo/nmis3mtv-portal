/**
 * app/api/ghp/certificate/route.js
 * Verifies GHP certificates from the Certificate Issuance sheet.
 */

import { NextResponse } from "next/server";
import { readSheet } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

function value(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }

  return "";
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isExpired(value) {
  if (!value) return false;

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return today > expiry;
}

function toCertificate(row) {
  const expiryDate = value(row, ["expiry_date", "valid_until", "expiration_date"]);

  return {
    controlNo: value(row, ["control_no", "control_number", "cert_number", "certificate_no"]),
    name: value(row, ["name", "full_name"]),
    score: value(row, ["score", "score_raw"]),
    status: value(row, ["status"]) || "PASSED",
    examDate: formatDate(value(row, ["exam_date", "date_issued", "issued_date"])),
    expiryDate: formatDate(expiryDate),
    isExpired: isExpired(expiryDate),
    certSent: value(row, ["cert_sent", "certificate_sent"]),
    verifyUrl: value(row, ["verify_url"]),
    qrImageUrl: value(row, ["qr_image_url"]),
  };
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = normalize(
      searchParams.get("id") || searchParams.get("certNumber") || "",
    );
    const email = String(searchParams.get("email") || "").trim().toLowerCase();

    if (!id && !email) {
      return NextResponse.json(
        { success: false, error: "Certificate number is required" },
        { status: 400 },
      );
    }

    const rows = await readSheet("Certificate Issuance");

    const row = rows.find((item) => {
      const controlNo = normalize(
        value(item, ["control_no", "control_number", "cert_number", "certificate_no"]),
      );
      const rowEmail = String(value(item, ["email"]) || "").trim().toLowerCase();

      return id ? controlNo === id : rowEmail === email;
    });

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Certificate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, certificate: toCertificate(row) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Certificate fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch certificate",
      },
      { status: 500 },
    );
  }
}
