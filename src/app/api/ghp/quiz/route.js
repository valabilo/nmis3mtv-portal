import { NextResponse } from "next/server";

const message = "Online GHP examinations are no longer available. NMIS records examination results manually after the booked seminar.";

export async function GET() {
  return NextResponse.json({ success: false, error: message }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: message }, { status: 410 });
}
