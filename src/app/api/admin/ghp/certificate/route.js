import { NextResponse } from "next/server";
import { getGHPAppointments } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { createGHPCertificatePdf } from "@/lib/ghpCertificate";

export const runtime = "nodejs";
export async function GET(request) {
  if (!requestHasDashboardSession(request)) return NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("appointmentId");
  const record = (await getGHPAppointments()).find((item) => item.appointment_id === id);
  if (!record?.certificate_number) return NextResponse.json({ success: false, error: "Certificate not found." }, { status: 404 });
  const pdf = await createGHPCertificatePdf(record);
  return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${record.certificate_number}.pdf"` } });
}
