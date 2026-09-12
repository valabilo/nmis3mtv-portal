import { NextResponse } from "next/server";
import { getRegistrationStatus } from "@/lib/registrationControl";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await getRegistrationStatus()) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load registration status." }, { status: 500 });
  }
}
