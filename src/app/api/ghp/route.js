/** Legacy online GHP certificate endpoint. Certificates are now issued manually. */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Online GHP certificate issuance is no longer available. Attend your booked seminar; NMIS records the examination result manually and issues signed certificates.",
  }, { status: 410 });
}
