import PDFDocument from "pdfkit";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function createGHPCertificatePdf(record) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", layout: "landscape", margin: 42 });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.rect(20, 20, 802, 555).lineWidth(3).stroke("#1a5c32");
    pdf.rect(28, 28, 786, 539).lineWidth(1).stroke("#d4a72c");
    pdf.fillColor("#1a5c32").font("Helvetica-Bold").fontSize(16)
      .text("REPUBLIC OF THE PHILIPPINES", { align: "center" });
    pdf.fontSize(12).text("Department of Agriculture", { align: "center" });
    pdf.fontSize(17).text("NATIONAL MEAT INSPECTION SERVICE", { align: "center" });
    pdf.moveDown(2).fillColor("#222").fontSize(28).text("CERTIFICATE OF COMPLETION", { align: "center" });
    pdf.moveDown(1).font("Helvetica").fontSize(14).text("This certificate is hereby presented to", { align: "center" });
    pdf.moveDown(.6).fillColor("#1a5c32").font("Helvetica-Bold").fontSize(25)
      .text(String(record.name || "").toUpperCase(), { align: "center", underline: true });
    pdf.moveDown(1).fillColor("#222").font("Helvetica").fontSize(14)
      .text("for satisfactorily participating in the MTV Drivers and Pahinante", { align: "center" })
      .text("Good Hygienic Practices (GHP) Seminar", { align: "center" });
    pdf.moveDown(.8).text(`Conducted on ${formatDate(record.seminar_date || record.certificate_issued_at)}`, { align: "center" });
    pdf.moveDown(2).fontSize(11).text(`Certificate No. ${record.certificate_number}`, 62, 480)
      .text(`Issued ${formatDate(record.certificate_issued_at)}`, 590, 480, { align: "right" });
    pdf.font("Helvetica-Bold").fontSize(12).text("NMIS RTOC III", 0, 520, { align: "center" });
    pdf.end();
  });
}
