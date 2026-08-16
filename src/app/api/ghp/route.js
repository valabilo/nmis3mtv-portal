/** Legacy online GHP certificate endpoint. Certificates are issued from the GHP seminar dashboard. */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Online GHP certificate issuance is no longer available. Attend your booked seminar; NMIS records the examination result and issues certificates from the seminar dashboard.",
  }, { status: 410 });
}
