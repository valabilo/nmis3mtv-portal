import { NextResponse } from "next/server";
import { getGHPAppointments, getCertificateIssuance } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { downloadDriveFile } from "@/lib/driveService";

export const runtime = "nodejs";

const safeFilePart = (value) => String(value || "")
  .trim()
  .replace(/[^a-z0-9]+/gi, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 100);

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
  try {
    const appointmentId = request.nextUrl.searchParams.get("appointmentId");
    const record = (await getGHPAppointments()).find((item) => item.appointment_id === appointmentId);
    if (!record?.certificate_number || record.exam_result !== "PASSED") return NextResponse.json({ success: false, error: "A passing score is required before generating a certificate." }, { status: 404 });
    const certificates = await getCertificateIssuance();
    const certificate = certificates.find((item) => String(item.control_no || item.certificate_number || "").trim().toUpperCase() === String(record.certificate_number).trim().toUpperCase());
    if (!certificate) return NextResponse.json({ success: false, error: "Certificate generation has not started yet. In the bound Apps Script, run sendCertificates() or make sure setup() has created its five-minute trigger." }, { status: 409 });
    const fileId = certificate?.pdf_file_id || certificate?.certificate_pdf_file_id || certificate?.drive_file_id;
    if (!fileId) return NextResponse.json({ success: false, error: "Certificate generation did not finish. Check Apps Script Executions for the sendCertificates() error, then run it again." }, { status: 409 });
    const pdf = await downloadDriveFile(fileId);
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    const filename = `NMIS_GHP_Certificate_${safeFilePart(record.certificate_number)}_${safeFilePart(record.name)}.pdf`;
    return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${filename}"` } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to download the certificate." }, { status: 500 });
  }
}
