import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { formatSeminarTime } from "@/lib/seminarTime";
import { OFFICE_INFO } from "@/lib/constants";

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function createGHPAttendanceSheet({ seminarDate, seminarTime, attendees }) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 38 });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    const drawHeader = (continued = false) => {
      pdf.fillColor("#1a5c32").font("Helvetica-Bold").fontSize(14).text("NATIONAL MEAT INSPECTION SERVICE – RTOC III", { align: "center" });
      pdf.fillColor("#222").fontSize(13).text("GHP SEMINAR ATTENDANCE SHEET", { align: "center" });
      pdf.moveDown(.5).font("Helvetica").fontSize(10)
        .text(`Date: ${formatDate(seminarDate)}`)
        .text(`Session: ${formatSeminarTime(seminarTime)}`)
        .text(`Venue: ${OFFICE_INFO.address}`);
      if (continued) pdf.text("Continued");
      pdf.moveDown(.7);
      const y = pdf.y; const x = 38; const widths = [30, 215, 135, 145];
      pdf.fillColor("#eef5f0").rect(x, y, 519, 22).fill();
      pdf.fillColor("#222").font("Helvetica-Bold").fontSize(9);
      ["No.", "Participant name", "Company / Establishment", "Signature"].forEach((label, index) => pdf.text(label, x + widths.slice(0, index).reduce((total, width) => total + width, 0) + 5, y + 7, { width: widths[index] - 10 }));
      pdf.y = y + 22;
      return { x, widths };
    };
    let table = drawHeader();
    attendees.forEach((attendee, index) => {
      if (pdf.y > 735) { pdf.addPage(); table = drawHeader(true); }
      const y = pdf.y; const rowHeight = 32;
      let cursor = table.x;
      table.widths.forEach((width) => { pdf.rect(cursor, y, width, rowHeight).strokeColor("#9aa9a0").lineWidth(.5).stroke(); cursor += width; });
      pdf.fillColor("#222").font("Helvetica").fontSize(9);
      pdf.text(String(index + 1), table.x + 5, y + 11, { width: table.widths[0] - 10, align: "center" });
      pdf.text(String(attendee.name || ""), table.x + table.widths[0] + 5, y + 7, { width: table.widths[1] - 10, height: rowHeight - 10 });
      pdf.text(String(attendee.company_name || attendee.meat_establishment || ""), table.x + table.widths[0] + table.widths[1] + 5, y + 7, { width: table.widths[2] - 10, height: rowHeight - 10 });
      pdf.y = y + rowHeight;
    });
    pdf.moveDown(2).font("Helvetica").fontSize(10).fillColor("#222").text("Prepared by: ________________________________     Date: __________________");
    pdf.end();
  });
}
