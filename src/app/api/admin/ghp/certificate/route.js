import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getGHPAppointments, getCertificateIssuance } from "@/lib/googleSheets";
import { requestHasDashboardSession } from "@/lib/dashboardAuth";
import { downloadDriveFile } from "@/lib/driveService";

export const runtime = "nodejs";

const safeFilePart = (value) => String(value || "")
  .trim()
  .replace(/[^a-z0-9]+/gi, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 100);

function matchCertificateRecord(record, certificates) {
  if (!record?.certificate_number || record.exam_result !== "PASSED") return null;
  const target = String(record.certificate_number).trim().toUpperCase();
  return certificates.find(
    (item) => String(item.control_no || item.certificate_number || "").trim().toUpperCase() === target,
  ) || null;
}

export async function GET(request) {
  if (!requestHasDashboardSession(request)) return NextResponse.json({ success: false, error: "Dashboard login required." }, { status: 401 });
  try {
    const appointmentId = request.nextUrl.searchParams.get("appointmentId");
    const zipRequested = request.nextUrl.searchParams.get("zip") === "1";
    const idsParam = request.nextUrl.searchParams.get("ids") || "";
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (zipRequested && ids.length) {
      const [appointments, certificates] = await Promise.all([
        getGHPAppointments(),
        getCertificateIssuance(),
      ]);
      const zip = new JSZip();
      const selectedRecords = appointments.filter((item) => ids.includes(item.appointment_id));
      const downloaded = [];

      for (const record of selectedRecords) {
        const certificate = matchCertificateRecord(record, certificates);
        if (!certificate) continue;
        const fileId = certificate?.pdf_file_id || certificate?.certificate_pdf_file_id || certificate?.drive_file_id;
        if (!fileId) continue;
        const pdf = await downloadDriveFile(fileId);
        const filename = `NMIS_GHP_Certificate_${safeFilePart(record.certificate_number)}_${safeFilePart(record.name)}.pdf`;
        zip.file(filename, pdf);
        downloaded.push(record.appointment_id);
      }

      if (!downloaded.length) {
        return NextResponse.json(
          { success: false, error: "No valid issued certificates were found for the selected seminar records." },
          { status: 404 },
        );
      }

      const archive = await zip.generateAsync({ type: "nodebuffer" });
      return new NextResponse(archive, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="NMIS_GHP_Certificates_${new Date().toISOString().slice(0, 10)}.zip"`,
        },
      });
    }

    const record = (await getGHPAppointments()).find((item) => item.appointment_id === appointmentId);
    if (!record?.certificate_number || record.exam_result !== "PASSED") return NextResponse.json({ success: false, error: "A passing score is required before generating a certificate." }, { status: 404 });
    const certificates = await getCertificateIssuance();
    const certificate = matchCertificateRecord(record, certificates);
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
