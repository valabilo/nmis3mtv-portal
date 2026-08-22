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

// Deploy this bound project as a Web app to reserve seminar seats atomically.
// Store GHP_BOOKING_SECRET in Script Properties, not in this source file.
function doPost(e) {
  try {
    var payload = JSON.parse((e.postData && e.postData.contents) || "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("GHP_BOOKING_SECRET");
    if (!secret || payload.secret !== secret) throw new Error("Unauthorized request.");
    if (payload.action === "reserveGhpAppointment") return jsonResponse_({ success: true, appointment: reserveGhpAppointment_(payload) });
    if (payload.action === "recordGhpResult") return jsonResponse_({ success: true, appointment: recordGhpResult_(payload) });
    if (payload.action === "renameGhpAttendee") return jsonResponse_({ success: true, appointment: renameGhpAttendee_(payload) });
    throw new Error("Unsupported request.");
  } catch (error) {
    return jsonResponse_({ success: false, error: error.message || "Unable to reserve the seminar seat." });
  }
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

function reserveGhpAppointment_(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("The booking system is busy. Please try again.");
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GHP_APPOINTMENTS_SHEET);
    if (!sheet) throw new Error("Missing sheet: " + GHP_APPOINTMENTS_SHEET);
    var rows = sheet.getDataRange().getValues();
    if (!rows.length) throw new Error("GHP_Appointments is missing its header row.");
    var headers = headerMap_(rows[0]);
    ["appointment_id", "name", "email", "contact", "company_name", "position", "meat_establishment", "valid_id_file_id", "valid_id_file_name", "remarks", "status", "seminar_date", "seminar_time"].forEach(function(header) {
      if (headers[header] === undefined) throw new Error("GHP_Appointments is missing the " + header + " column.");
    });
    for (var existingRow = 1; existingRow < rows.length; existingRow++) {
      if (String(rows[existingRow][headers.appointment_id] || "") !== String(payload.appointmentId || "")) continue;
      return rowObject_(rows[0], rows[existingRow]);
    }
    if (hasActiveCertificateForEmail_(payload.email)) {
      throw new Error("You already have an active GHP certificate. You may book another seminar after your current certificate expires.");
    }
    var booked = 0;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][headers.seminar_date] || "") === payload.seminarDate && String(rows[i][headers.seminar_time] || "") === payload.seminarTime && ["Cancelled", "Failed", "Not yet passed"].indexOf(String(rows[i][headers.status] || "")) === -1) booked++;
    }
    if (booked >= 30) throw new Error("That seminar is already full. Please choose another schedule.");
    var now = new Date().toISOString();
    var values = rows[0].map(function(header) {
      switch (String(header || "").trim().toLowerCase()) {
        case "appointment_id": return payload.appointmentId;
        case "requested_at": return now;
        case "name": return payload.name;
        case "email": return payload.email;
        case "contact": return payload.contact || "";
        case "company_name": return payload.companyName || "";
        case "position": return payload.position || "";
        case "meat_establishment": return payload.meatEstablishment || "";
        case "valid_id_file_id": return payload.validIdFileId || "";
        case "valid_id_file_name": return payload.validIdFileName || "";
        case "remarks": return payload.remarks || "";
        case "status": return "Scheduled";
        case "seminar_date": return payload.seminarDate;
        case "seminar_time": return payload.seminarTime;
        default: return "";
      }
    });
    sheet.appendRow(values);
    return { appointment_id: payload.appointmentId, requested_at: now, name: payload.name, email: payload.email, contact: payload.contact || "", company_name: payload.companyName || "", position: payload.position || "", meat_establishment: payload.meatEstablishment || "", valid_id_file_id: payload.validIdFileId || "", valid_id_file_name: payload.validIdFileName || "", remarks: payload.remarks || "", status: "Scheduled", seminar_date: payload.seminarDate, seminar_time: payload.seminarTime };
  } finally {
    lock.releaseLock();
  }
}

// A user may only be prevented from booking by an issued, passing certificate
// that is still valid. In particular, a passed result or an incomplete row in
// Certificate Issuance must not prevent a new seminar booking. This check runs
// while the booking lock is held, so every booking path consistently applies
// the rule.
function hasActiveCertificateForEmail_(email) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.issuanceSheetName);
  if (!sheet || sheet.getLastRow() < 2) return false;
  var rows = sheet.getDataRange().getValues();
  var headers = headerMap_(rows[0] || []);
  if (headers.control_no === undefined || headers.email === undefined || headers.status === undefined || headers.expiry_date === undefined) return false;
  var candidate = String(email || "").trim().toLowerCase();
  if (!candidate) return false;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.email] || "").trim().toLowerCase() !== candidate) continue;
    var controlNo = String(rows[i][headers.control_no] || "").trim();
    var status = String(rows[i][headers.status] || "").trim().toUpperCase();
    var expiry = new Date(rows[i][headers.expiry_date]); expiry.setHours(0, 0, 0, 0);
    if (controlNo && status === "PASSED" && !isNaN(expiry.getTime()) && expiry >= today) return true;
  }
  return false;
}

// Saves the score, assigns the next sequential control number, and creates the
// PDF in the same locked request. This deliberately replaces the delayed trigger.
function recordGhpResult_(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("The certificate system is busy. Please try again.");
  try {
    var score = Number(payload.score);
    if (!payload.appointmentId || score < 1 || score > 10 || score % 1 !== 0) throw new Error("Enter a whole-number score from 1 to 10.");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GHP_APPOINTMENTS_SHEET);
    var rows = sheet.getDataRange().getValues(), headers = headerMap_(rows[0] || []), row = -1;
    for (var i = 1; i < rows.length; i++) if (String(rows[i][headers.appointment_id]) === String(payload.appointmentId)) { row = i; break; }
    if (row < 0) throw new Error("GHP appointment not found.");
    var passed = score >= 7, controlNo = String(rows[row][headers.certificate_number] || "").trim();
    if (passed && !controlNo) controlNo = nextControlNumber_(rows, headers);
    var now = new Date().toISOString();
    rows[row][headers.status] = passed ? "Passed" : "Not yet passed";
    rows[row][headers.exam_result] = passed ? "PASSED" : "FAILED";
    rows[row][headers.exam_score] = score + "/10";
    rows[row][headers.exam_recorded_at] = now;
    rows[row][headers.certificate_number] = passed ? controlNo : "";
    rows[row][headers.certificate_issued_at] = passed ? (rows[row][headers.certificate_issued_at] || now) : "";
    sheet.getRange(row + 1, 1, 1, rows[0].length).setValues([rows[row]]);
    if (passed) generateCertificateForAppointment_(rows[row], headers, controlNo);
    return rowObject_(rows[0], rows[row]);
  } finally { lock.releaseLock(); }
}

function renameGhpAttendee_(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("The certificate system is busy. Please try again.");
  try {
    var name = String(payload.name || "").trim();
    if (!payload.appointmentId || name.length < 2) throw new Error("A valid attendee name is required.");
    var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getSheetByName(GHP_APPOINTMENTS_SHEET);
    var rows = sheet.getDataRange().getValues(), headers = headerMap_(rows[0] || []), row = -1;
    for (var i = 1; i < rows.length; i++) if (String(rows[i][headers.appointment_id]) === String(payload.appointmentId)) { row = i; break; }
    if (row < 0) throw new Error("GHP appointment not found.");
    rows[row][headers.name] = name;
    sheet.getRange(row + 1, 1, 1, rows[0].length).setValues([rows[row]]);
    var controlNo = String(rows[row][headers.certificate_number] || "").trim();
    if (controlNo) {
      var issuance = ss.getSheetByName(CONFIG.issuanceSheetName); ensureIssuanceHeaders_(issuance);
      var certRows = issuance.getDataRange().getValues(), certHeaders = headerMap_(certRows[0]);
      for (var j = 1; j < certRows.length; j++) if (String(certRows[j][certHeaders.control_no] || "").trim().toUpperCase() === controlNo.toUpperCase()) {
        certRows[j][certHeaders.name] = name;
        issuance.getRange(j + 1, 1, 1, certRows[0].length).setValues([certRows[j]]);
        regenerateCertificate(controlNo);
        break;
      }
    }
    return rowObject_(rows[0], rows[row]);
  } finally { lock.releaseLock(); }
}

function nextControlNumber_(appointmentRows, appointmentHeaders) {
  var max = 1000, seen = {};
  function inspect(value) { var match = String(value || "").trim().match(/^GHP-\d{4}-(\d+)$/i); if (match) max = Math.max(max, Number(match[1])); }
  for (var i = 1; i < appointmentRows.length; i++) inspect(appointmentRows[i][appointmentHeaders.certificate_number]);
  var issuance = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.issuanceSheetName);
  if (issuance) { var rows = issuance.getDataRange().getValues(), headers = headerMap_(rows[0] || []); for (var j = 1; j < rows.length; j++) inspect(rows[j][headers.control_no]); }
  return "GHP-" + new Date().getFullYear() + "-" + String(max + 1);
}

function generateCertificateForAppointment_(source, headers, controlNo) {
  var issuance = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.issuanceSheetName); ensureIssuanceHeaders_(issuance);
  var rows = issuance.getDataRange().getValues(), issuanceHeaders = headerMap_(rows[0] || []);
  for (var i = 1; i < rows.length; i++) if (String(rows[i][issuanceHeaders.control_no] || "").trim().toUpperCase() === controlNo.toUpperCase()) return;
  var examDate = source[headers.exam_recorded_at] || source[headers.seminar_date], pdfFile = createCertificatePdf_(controlNo, String(source[headers.name] || "").trim(), examDate);
  var expiry = new Date(examDate); expiry.setFullYear(expiry.getFullYear() + 1);
  var verifyUrl = CONFIG.verifyUrl + "?id=" + encodeURIComponent(controlNo);
  issuance.appendRow([controlNo, source[headers.name] || "", source[headers.exam_score] || "", "PASSED", formatDateSafe_(examDate), source[headers.email] || "", "Generated", verifyUrl, qrUrl_(verifyUrl), formatDateSafe_(expiry), pdfFile.getId()]);
}

function rowObject_(headers, row) { var object = {}; for (var i = 0; i < headers.length; i++) object[String(headers[i] || "").trim().toLowerCase()] = row[i] || ""; return object; }

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

// Optional cleanup helper. Certificates are now created immediately when the
// dashboard saves a passing score, so no time-based trigger is required.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "sendCertificates") ScriptApp.deleteTrigger(trigger);
  });
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
  // Keep the QR self-contained. QuickChart cannot reliably retrieve a private or
  // redirected Google Drive logo URL, which makes Slides reject the image.
  return "https://quickchart.io/qr?size=300&margin=1&errorCorrectionLevel=H&text=" + encodeURIComponent(verifyUrl);
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

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function searchPage_() {
  return "<html><body style='font-family:Arial;padding:30px'><h2>NMIS Certificate Verification</h2><input id='id' placeholder='GHP-2026-123456'><button onclick='go()'>Verify</button><script>function go(){location.search='?id='+encodeURIComponent(document.getElementById('id').value)}</script></body></html>";
}

function certificatePage_(certificate) {
  return "<html><body style='font-family:Arial;padding:30px'><h2>Certificate " + (certificate.isExpired ? "Expired" : "Valid") + "</h2><p><b>Issued to:</b> " + escapeHtml_(certificate.name) + "</p><p><b>Control number:</b> " + escapeHtml_(certificate.controlNo) + "</p><p><b>Certificate issued:</b> Generated</p><p><b>Valid until:</b> " + escapeHtml_(certificate.expiryDate) + "</p></body></html>";
}

function notFoundPage_(id) {
  return "<html><body style='font-family:Arial;padding:30px'><h2>Certificate not found</h2><p>" + escapeHtml_(id) + " is not in the NMIS registry.</p></body></html>";
}
