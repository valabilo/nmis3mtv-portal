// NMIS GHP Certificate Apps Script
// Replace the complete bound Apps Script project with this file.
// Certificates are generated for passed GHP seminar attendees and saved to Drive.
// No certificate emails are sent. The portal administrator downloads them instead.

var CONFIG = {
  issuanceSheetName: "Certificate Issuance",
  attemptsSheetName: "Quiz_Attempts", // Retained for compatibility with the existing workbook.
  templateId: "1wksbtfWGd_qqq0DXPC3P4L_bI2hsN2xtAokptrmDEbQ",
  nmisLogoUrl: "https://drive.google.com/uc?export=download&id=1iYHtd2lBNcNDfrC6_oT4UzLdirlPg79h",
  verifyUrl: "https://nmis3mtv-portal.vercel.app/certificate-verification",
  noEmailFolderId: "1F6yJIFLX1y6Yxp32cvu-zCdWZSZvVsBH", // Permanent admin-download PDF folder.
  startingCounter: 1000, // Retained for existing records; portal assigns certificate numbers.
};

var GHP_APPOINTMENTS_SHEET = "GHP_Appointments";

// Certificate verification web app
function doGet(e) {
  var id = String((e.parameter && e.parameter.id) || "").trim().toUpperCase();
  if (!id) return HtmlService.createHtmlOutput(searchPage_()).setTitle("Certificate Verification - NMIS RTOC III");
  var certificate = findCertificateById_(id);
  return HtmlService.createHtmlOutput(certificate ? certificatePage_(certificate) : notFoundPage_(id))
    .setTitle("Certificate Verification - NMIS RTOC III");
}

function lookupCertificate(id) {
  var certificate = findCertificateById_(id);
  return certificate ? { found: true, controlNo: certificate.controlNo, name: certificate.name, score: certificate.score, status: certificate.status, examDate: certificate.examDate, expiryDate: certificate.expiryDate, isExpired: certificate.isExpired } : { found: false };
}

function findCertificateById_(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.issuanceSheetName);
  if (!sheet) throw new Error("Missing sheet: " + CONFIG.issuanceSheetName);
  var rows = sheet.getDataRange().getValues();
  var headers = headerMap_(rows[0] || []);
  var cleanId = String(id || "").trim().toUpperCase();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.control_no] || "").trim().toUpperCase() !== cleanId) continue;
    var expiry = rows[i][headers.expiry_date];
    var expiryDate = new Date(expiry); expiryDate.setHours(0, 0, 0, 0);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return { controlNo: rows[i][headers.control_no], name: rows[i][headers.name], score: rows[i][headers.score], status: rows[i][headers.status], examDate: formatDateSafe_(rows[i][headers.exam_date]), expiryDate: formatDateSafe_(expiry), isExpired: !isNaN(expiryDate.getTime()) && today > expiryDate };
  }
  return null;
}

// Run manually after recording scores, or use the five-minute trigger from setup().
function sendCertificates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var appointmentsSheet = ss.getSheetByName(GHP_APPOINTMENTS_SHEET);
  var issuanceSheet = ss.getSheetByName(CONFIG.issuanceSheetName);
  if (!appointmentsSheet) throw new Error("Missing sheet: " + GHP_APPOINTMENTS_SHEET);
  if (!issuanceSheet) throw new Error("Missing sheet: " + CONFIG.issuanceSheetName);
  if (!CONFIG.noEmailFolderId) throw new Error("Missing CONFIG.noEmailFolderId.");

  ensureIssuanceHeaders_(issuanceSheet);
  var appointments = appointmentsSheet.getDataRange().getValues();
  if (appointments.length < 2) return;
  var appointmentHeaders = headerMap_(appointments[0]);
  var issuanceRows = issuanceSheet.getDataRange().getValues();
  var issuanceHeaders = headerMap_(issuanceRows[0]);
  var existing = {};
  for (var i = 1; i < issuanceRows.length; i++) existing[String(issuanceRows[i][issuanceHeaders.control_no] || "").trim().toUpperCase()] = true;

  for (var row = 1; row < appointments.length; row++) {
    var source = appointments[row];
    var result = String(source[appointmentHeaders.exam_result] || "").trim().toUpperCase();
    var controlNo = String(source[appointmentHeaders.certificate_number] || "").trim().toUpperCase();
    if (result !== "PASSED" || !controlNo || existing[controlNo]) continue;

    var name = String(source[appointmentHeaders.name] || "").trim();
    var examDate = source[appointmentHeaders.exam_recorded_at] || source[appointmentHeaders.seminar_date];
    var pdfFile = createCertificatePdf_(controlNo, name, examDate);
    var expiry = new Date(examDate); expiry.setFullYear(expiry.getFullYear() + 1);
    var verifyUrl = CONFIG.verifyUrl + "?id=" + encodeURIComponent(controlNo);
    var qrUrl = qrUrl_(verifyUrl);
    issuanceSheet.appendRow([controlNo, name, source[appointmentHeaders.exam_score] || "", "PASSED", formatDateSafe_(examDate), source[appointmentHeaders.email] || "", "Generated", verifyUrl, qrUrl, formatDateSafe_(expiry), pdfFile.getId()]);
    existing[controlNo] = true;
  }
}

// Run this manually once for an already-generated certificate that needs its QR code rebuilt.
function regenerateCertificate(controlNo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.issuanceSheetName);
  if (!sheet) throw new Error("Missing sheet: " + CONFIG.issuanceSheetName);
  ensureIssuanceHeaders_(sheet);
  var rows = sheet.getDataRange().getValues();
  var headers = headerMap_(rows[0]);
  var id = String(controlNo || "").trim().toUpperCase();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.control_no] || "").trim().toUpperCase() !== id) continue;
    var oldFileId = rows[i][headers.pdf_file_id];
    var file = createCertificatePdf_(id, String(rows[i][headers.name] || "").trim(), rows[i][headers.exam_date]);
    sheet.getRange(i + 1, headers.pdf_file_id + 1).setValue(file.getId());
    if (oldFileId) { try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (error) {} }
    return file.getId();
  }
  throw new Error("Certificate not found: " + id);
}

function createCertificatePdf_(controlNo, name, examDate) {
  var expiry = new Date(examDate); expiry.setFullYear(expiry.getFullYear() + 1);
  var verifyUrl = CONFIG.verifyUrl + "?id=" + encodeURIComponent(controlNo);
  var copy = DriveApp.getFileById(CONFIG.templateId).makeCopy(controlNo + " - " + name);
  var presentation = SlidesApp.openById(copy.getId());
  presentation.replaceAllText("{{Name}}", name);
  presentation.replaceAllText("{{Exam Date}}", formatDateSafe_(examDate));
  presentation.replaceAllText("{{Expiry Date}}", formatDateSafe_(expiry));
  presentation.replaceAllText("{{Control Number}}", controlNo);
  var qrBlob = getQrBlob_(verifyUrl);
  var qrInserted = false;
  presentation.getSlides().forEach(function(slide) {
    slide.getShapes().forEach(function(shape) {
      try {
        if (shape.getText().asString().trim() !== "{{QR_URL}}") return;
        var left = shape.getLeft(), top = shape.getTop(), width = shape.getWidth(), height = shape.getHeight();
        slide.insertImage(qrBlob, left, top, width, height);
        shape.remove();
        qrInserted = true;
      } catch (error) { Logger.log("QR placeholder could not be replaced: " + error.message); }
    });
  });
  if (!qrInserted) throw new Error("The certificate template is missing a text box containing {{QR_URL}}.");
  presentation.saveAndClose();
  var pdf = DriveApp.getFileById(copy.getId()).getAs("application/pdf");
  var pdfFile = DriveApp.getFolderById(CONFIG.noEmailFolderId).createFile(pdf);
  pdfFile.setName(controlNo + " - " + name + ".pdf");
  copy.setTrashed(true);
  return pdfFile;
}

// Run this once to create the automatic certificate-generation trigger.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "sendCertificates") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sendCertificates").timeBased().everyMinutes(5).create();
}

function ensureIssuanceHeaders_(sheet) {
  var expected = ["control_no", "name", "score", "status", "exam_date", "email", "cert_sent", "verify_url", "qr_image_url", "expiry_date", "pdf_file_id"];
  if (!sheet.getLastRow()) { sheet.appendRow(expected); return; }
  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  for (var i = current.length; i < expected.length; i++) sheet.getRange(1, i + 1).setValue(expected[i]);
}

function headerMap_(headers) {
  var map = {};
  headers.forEach(function(header, index) { map[String(header || "").trim().toLowerCase()] = index; });
  return map;
}

function qrUrl_(verifyUrl) {
  return "https://quickchart.io/qr?size=300&type=dots&margin=1&errorCorrectionLevel=H&centerImageUrl=" + encodeURIComponent(CONFIG.nmisLogoUrl) + "&centerImageSizeRatio=0.3&text=" + encodeURIComponent(verifyUrl);
}

function getQrBlob_(verifyUrl) {
  var response = UrlFetchApp.fetch(qrUrl_(verifyUrl), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error("QR code service returned HTTP " + response.getResponseCode() + ".");
  }
  var blob = response.getBlob();
  if (!blob || !blob.getBytes().length) throw new Error("QR code service returned an empty image.");
  return blob.setName("certificate-qr.png");
}

function formatDateSafe_(value) {
  var date = new Date(value);
  return isNaN(date.getTime()) ? String(value || "") : Utilities.formatDate(date, Session.getScriptTimeZone(), "MMMM dd, yyyy");
}

function escapeHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function searchPage_() {
  return "<html><body style='font-family:Arial;padding:30px'><h2>NMIS Certificate Verification</h2><input id='id' placeholder='GHP-2026-123456'><button onclick='go()'>Verify</button><script>function go(){location.search='?id='+encodeURIComponent(document.getElementById('id').value)}</script></body></html>";
}

function certificatePage_(certificate) {
  return "<html><body style='font-family:Arial;padding:30px'><h2>Certificate " + (certificate.isExpired ? "Expired" : "Valid") + "</h2><p><b>Issued to:</b> " + escapeHtml_(certificate.name) + "</p><p><b>Control number:</b> " + escapeHtml_(certificate.controlNo) + "</p><p><b>Score:</b> " + escapeHtml_(certificate.score) + "</p><p><b>Exam date:</b> " + escapeHtml_(certificate.examDate) + "</p><p><b>Valid until:</b> " + escapeHtml_(certificate.expiryDate) + "</p></body></html>";
}

function notFoundPage_(id) {
  return "<html><body style='font-family:Arial;padding:30px'><h2>Certificate not found</h2><p>" + escapeHtml_(id) + " is not in the NMIS registry.</p></body></html>";
}
