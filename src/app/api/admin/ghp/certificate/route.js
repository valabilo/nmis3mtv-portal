import { NextResponse } from "next/server";
import { getGHPAppointments } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { createGHPCertificatePdf } from "@/lib/ghpCertificate";

export const runtime = "nodejs";
export async function GET(request) {
  if (!requestHasDashboardSession(request)) return NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("appointmentId");
  const record = (await getGHPAppointments()).find((item) => item.appointment_id === id);
  if (!record?.certificate_number || record.exam_result !== "PASSED") return NextResponse.json({ success: false, error: "A passed manual examination result and certificate number are required before printing." }, { status: 404 });
  const pdf = await createGHPCertificatePdf(record);
  const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${record.certificate_number}.pdf"` } });
}
