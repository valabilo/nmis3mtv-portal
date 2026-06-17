/**
 * lib/sendMail.js
 * Email notifications via Nodemailer
 */

import nodemailer from "nodemailer";
import {
  generateOrderOfPaymentPdf,
  orderOfPaymentFilename,
} from "@/lib/orderOfPayment";

let transporter = null;

function normalizeSiteUrl(siteUrl) {
  const value = String(siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const fallback = "https://your-portal-url.com";

  return (value || fallback).replace(/\/+$/, "");
}

function formatMailAddress(name, address) {
  const cleanAddress = String(address || "").trim();
  const cleanName = String(name || "").trim();

  if (!cleanAddress) return undefined;
  if (!cleanName) return cleanAddress;

  return {
    name: cleanName,
    address: cleanAddress,
  };
}

function getSenderName() {
  return process.env.GMAIL_FROM_NAME || "MTV Portal";
}

function getSenderAddress(authUser) {
  return (
    process.env.CONTACT_RECIPIENT_EMAIL ||
    process.env.NMIS_CONTACT_EMAIL ||
    authUser ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER
  );
}

function getDefaultSender() {
  return formatMailAddress(getSenderName(), getSenderAddress());
}

function getOfficeRecipient() {
  const recipient =
    process.env.CONTACT_RECIPIENT_EMAIL ||
    process.env.NMIS_CONTACT_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER;

  return formatMailAddress(getSenderName(), recipient);
}

const EMAIL_CSS = `
  <style>
    @media only screen and (max-width: 520px) {
      .email-shell { padding: 12px !important; }
      .email-header, .email-body { padding: 18px !important; }
      .email-title { font-size: 18px !important; line-height: 1.3 !important; }
      .email-code { font-size: 20px !important; letter-spacing: 1px !important; word-break: break-word !important; }
      .email-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; margin: 8px 0 0 !important; }
      .email-detail-label, .email-detail-value { display: block !important; width: 100% !important; padding: 4px 0 !important; }
      .email-body table, .email-body tbody, .email-body tr, .email-body td { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .email-body td { padding: 4px 0 !important; }
    }
  </style>
`;

function shellStyle(maxWidth = 600) {
  return `font-family:Arial,sans-serif;width:100%;max-width:${maxWidth}px;margin:0 auto;padding:24px 16px;background:#f9f9f9;color:#333;line-height:1.55;box-sizing:border-box;`;
}

const headerStyle =
  "background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;box-sizing:border-box;";
const titleStyle =
  "color:#ffffff;margin:0;font-size:20px;line-height:1.3;font-weight:bold;";
const bodyStyle =
  "background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;box-sizing:border-box;";
const tableStyle =
  "width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;table-layout:fixed;";
const primaryButtonStyle =
  "display:inline-block;background:#1a5c32;color:#ffffff;text-decoration:none;font-weight:bold;padding:11px 14px;border-radius:6px;line-height:1.3;";
const secondaryButtonStyle =
  "display:inline-block;background:#ffffff;color:#1a5c32;border:1px solid #1a5c32;text-decoration:none;font-weight:bold;padding:10px 14px;border-radius:6px;line-height:1.3;";

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Missing Gmail credentials. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    defaults: {
      from: formatMailAddress(getSenderName(), getSenderAddress(user)),
    },
  });

  return transporter;
}

export async function sendApplicationConfirmation(
  email,
  refNumber,
  applicantName,
  options = {},
) {
  const transport = getTransporter();
  const siteUrl = normalizeSiteUrl(options.siteUrl);

  return transport.sendMail({
    from: getDefaultSender(),
    to: formatMailAddress(applicantName, email),
    subject: `MTV Application Confirmation - ${refNumber}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">MTV Portal – Application Submitted</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 14px;">Dear <strong>${applicantName}</strong>,</p>
          <p style="margin:0 0 14px;">Your MTV accreditation application has been successfully submitted and received by NMIS RTOC III.</p>
          <div style="background:#e6f2ec;border:1px dashed #1a5c32;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p class="email-code" style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#1a5c32;letter-spacing:2px;word-break:break-word;">${refNumber}</p>
          </div>
          <p style="margin:0 0 14px;">Please keep this reference number for tracking your application status.</p>
          <p style="margin:0 0 14px;">Our team will review your documents and notify you of any updates. Processing typically takes <strong>1-3 working days</strong> after submission of complete requirements.</p>
          <p style="margin:0 0 14px;">You can track your application status at any time by visiting the <a href="${siteUrl}/application-status?ref=${encodeURIComponent(refNumber)}" style="color:#1a5c32;font-weight:bold;word-break:break-word;">Application Status page</a>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="margin:0 0 14px;font-size:13px;color:#888;">If you did not submit this application, please contact us immediately at <a href="mailto:rtoc3@nmis.gov.ph" style="color:#1a5c32;word-break:break-word;">rtoc3@nmis.gov.ph</a>.</p>
          <p style="margin:24px 0 0;">Best regards,<br/><strong>NMIS Regional Technical Operation Center III</strong><br/>San Fernando, Pampanga</p>
        </div>
      </div>
    `,
  });
}

export async function sendApplicationNotificationToNMIS(applicationData) {
  const transport = getTransporter();
  const recipient = getOfficeRecipient();

  if (!recipient) {
    throw new Error("Missing CONTACT_RECIPIENT_EMAIL or Gmail sender address.");
  }

  const {
    refNumber,
    registeredOwner,
    email,
    contact,
    address,
    region,
    province,
    plate,
    vtype,
    vmake,
    vmodel,
    vyear,
    vcolor,
    vengine,
    vchassis,
    crNumber,
    orNumber,
    ltoClientId,
    bodyType,
    fuelType,
    cooling,
    capacity,
    grossWeight,
    netCapacity,
    material,
    meatEstablishment,
    intendedRoute,
    ghpCertNumber,
    applicationType,
    bname,
    btype,
    baddress,
  } = applicationData;

  return transport.sendMail({
    from: getDefaultSender(),
    to: recipient,
    replyTo: formatMailAddress(registeredOwner, email),
    subject: `[MTV Portal] New Application Submitted – ${refNumber}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(650)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">New MTV Application Received</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <div style="background:#e6f2ec;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p class="email-code" style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:2px;word-break:break-word;">${refNumber}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#555;">Application Type: <strong>${applicationType || "New"}</strong></p>
          </div>

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;margin:24px 0 10px;">Applicant Information</h3>
          <table style="${tableStyle}">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Registered Owner</td><td style="padding:6px 0;font-weight:bold;">${registeredOwner}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#888;">Contact Number</td><td style="padding:6px 0;">${contact}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Address</td><td style="padding:6px 0;">${address}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Region</td><td style="padding:6px 0;">${region}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Province</td><td style="padding:6px 0;">${province}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">GHP Cert No.</td><td style="padding:6px 0;">${ghpCertNumber || "Not provided"}</td></tr>
          </table>

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;margin:24px 0 10px;">Vehicle Information</h3>
          <table style="${tableStyle}">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Plate Number</td><td style="padding:6px 0;font-weight:bold;">${plate}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Vehicle Type</td><td style="padding:6px 0;">${vtype}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Make / Model / Year</td><td style="padding:6px 0;">${vmake} ${vmodel} (${vyear})</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Color</td><td style="padding:6px 0;">${vcolor || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Engine No.</td><td style="padding:6px 0;">${vengine || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Chassis No.</td><td style="padding:6px 0;">${vchassis || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">CR Number</td><td style="padding:6px 0;">${crNumber || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">OR Number</td><td style="padding:6px 0;">${orNumber || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">LTO Client ID</td><td style="padding:6px 0;">${ltoClientId || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Body Type</td><td style="padding:6px 0;">${bodyType || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Fuel Type</td><td style="padding:6px 0;">${fuelType || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Cooling Capacity</td><td style="padding:6px 0;">${cooling || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Load Capacity</td><td style="padding:6px 0;">${capacity} kg</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Gross Weight</td><td style="padding:6px 0;">${grossWeight || "—"} kg</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Net Capacity</td><td style="padding:6px 0;">${netCapacity || "—"} kg</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Compartment Material</td><td style="padding:6px 0;">${material || "—"}</td></tr>
          </table>

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;margin:24px 0 10px;">Business Information</h3>
          <table style="${tableStyle}">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Meat Establishment</td><td style="padding:6px 0;">${meatEstablishment}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Intended Route</td><td style="padding:6px 0;">${intendedRoute}</td></tr>
            ${bname ? `<tr><td style="padding:6px 0;color:#888;">Business Name</td><td style="padding:6px 0;">${bname}</td></tr>` : ""}
            ${btype ? `<tr><td style="padding:6px 0;color:#888;">Business Type</td><td style="padding:6px 0;">${btype}</td></tr>` : ""}
            ${baddress ? `<tr><td style="padding:6px 0;color:#888;">Business Address</td><td style="padding:6px 0;">${baddress}</td></tr>` : ""}
          </table>

          <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:16px;">
            <p style="margin:0;font-size:14px;color:#795548;">📎 All uploaded documents have been saved to Google Drive. Please log in to the portal to review and process this application.</p>
          </div>

          <p style="margin-top:24px;font-size:13px;color:#888;">This is an automated notification from the MTV Portal System.</p>
        </div>
      </div>
    `,
  });
}

export async function sendApplicationStatusUpdateToApplicant(applicationData) {
  const transport = getTransporter();
  const {
    reference,
    registeredOwner,
    email,
    status,
    remarks,
    plate,
    businessName,
    siteUrl: applicationSiteUrl,
  } = applicationData;
  const siteUrl = normalizeSiteUrl(applicationSiteUrl);
  const amendmentUrl = `${siteUrl}/apply?amend=${encodeURIComponent(reference)}`;
  const orderOfPaymentUrl = `${siteUrl}/api/applications/order-of-payment?ref=${encodeURIComponent(reference)}`;
  const paymentSubmissionUrl = `${siteUrl}/application-status?ref=${encodeURIComponent(reference)}&payment=1`;
  const showAmendmentLink = status === "Rejected Application";
  const showOrderOfPayment = status === "For Payment";
  const showProofAmendmentLink = status === "Rejected Proof of Payment";
  const isRejected = status === "Rejected Application";
  const isApproved = status === "Completed";
  const isPaymentRejected = status === "Rejected Proof of Payment";
  const statusCopy = (() => {
    if (isRejected) {
      return {
        subject: `MTV Application Rejected - ${reference}`,
        title: "MTV Application Rejected",
        lead:
          "After review, your MTV application has been rejected by NMIS RTOC III.",
        summaryLabel: "Application Result",
        summaryValue: "Rejected",
        summaryColor: "#b42318",
        remarksTitle: "Reason for rejection",
      };
    }

    if (isApproved) {
      return {
        subject: `MTV Application Approved - ${reference}`,
        title: "MTV Application Approved",
        lead:
          "Your MTV application has been approved by NMIS RTOC III. Please coordinate with the office for the release of your Certificate of Registration and official MTV sticker, if applicable.",
        summaryLabel: "Application Result",
        summaryValue: "Approved",
        summaryColor: "#1a5c32",
        remarksTitle: "Remarks",
      };
    }

    if (showOrderOfPayment) {
      return {
        subject: `MTV Order of Payment - ${reference}`,
        title: "Order of Payment Issued",
        lead:
          "Your MTV application has been assessed, and your Order of Payment is now available.",
        summaryLabel: "Next Step",
        summaryValue: "Payment Required",
        summaryColor: "#1a5c32",
        remarksTitle: "Remarks",
      };
    }

    if (isPaymentRejected) {
      return {
        subject: `MTV Proof of Payment Requires Correction - ${reference}`,
        title: "Proof of Payment Requires Correction",
        lead:
          "Your submitted proof of payment could not be accepted. Please review the remarks below and upload the corrected proof of payment.",
        summaryLabel: "Payment Review Result",
        summaryValue: "Correction Required",
        summaryColor: "#b45309",
        remarksTitle: "Reason for correction",
      };
    }

    if (status === "For Payment Verification") {
      return {
        subject: `MTV Payment Under Verification - ${reference}`,
        title: "Payment Under Verification",
        lead:
          "Your proof of payment has been received and is now being verified by NMIS RTOC III.",
        summaryLabel: "Current Step",
        summaryValue: "Payment Verification",
        summaryColor: "#1a5c32",
        remarksTitle: "Remarks",
      };
    }

    if (status === "Payment Verified") {
      return {
        subject: `MTV Payment Verified - ${reference}`,
        title: "Payment Verified",
        lead:
          "Your payment has been verified. NMIS RTOC III will proceed with the remaining processing of your MTV application.",
        summaryLabel: "Payment Result",
        summaryValue: "Verified",
        summaryColor: "#1a5c32",
        remarksTitle: "Remarks",
      };
    }

    if (status === "Cancelled") {
      return {
        subject: `MTV Application Cancelled - ${reference}`,
        title: "MTV Application Cancelled",
        lead:
          "Your MTV application has been cancelled. Please review the remarks below or contact NMIS RTOC III for clarification.",
        summaryLabel: "Application Result",
        summaryValue: "Cancelled",
        summaryColor: "#b42318",
        remarksTitle: "Remarks",
      };
    }

    return {
      subject: `MTV Application Review - ${reference}`,
      title: "MTV Application Review",
      lead:
        "Your MTV application is currently being reviewed by NMIS RTOC III.",
      summaryLabel: "Current Step",
      summaryValue: status || "Under Review",
      summaryColor: "#1a5c32",
      remarksTitle: "Remarks",
    };
  })();
  const attachments = showOrderOfPayment
    ? [
        {
          filename: orderOfPaymentFilename(reference),
          content: await generateOrderOfPaymentPdf(
            applicationData,
            applicationData.onlinePayment || {},
            { statusUrl: paymentSubmissionUrl },
          ),
          contentType: "application/pdf",
        },
      ]
    : [];

  if (!email) {
    throw new Error("Applicant email address is missing.");
  }

  return transport.sendMail({
    from: getDefaultSender(),
    to: formatMailAddress(registeredOwner, email),
    subject: statusCopy.subject,
    attachments,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">${statusCopy.title}</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 14px;">Dear <strong>${registeredOwner || "Applicant"}</strong>,</p>
          <p style="margin:0 0 14px;">${statusCopy.lead}</p>
          <div style="background:#e6f2ec;border:1px solid #cfe5d8;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">Reference Number</p>
            <p class="email-code" style="margin:0 0 14px;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:1px;word-break:break-word;">${reference}</p>
            <p style="margin:0;font-size:14px;color:#555;">${statusCopy.summaryLabel}</p>
            <p style="margin:6px 0 0;font-size:16px;color:${statusCopy.summaryColor};"><strong>${statusCopy.summaryValue}</strong></p>
          </div>
          <table style="${tableStyle}">
            <tr><td style="padding:6px 0;color:#888;width:38%;">Plate Number</td><td style="padding:6px 0;">${plate || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Business Name</td><td style="padding:6px 0;">${businessName || "Not provided"}</td></tr>
          </table>
          ${
            remarks
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 6px;font-weight:bold;color:#795548;">${statusCopy.remarksTitle}</p><p style="margin:0;color:#555;line-height:1.55;">${remarks}</p></div>`
              : ""
          }
          ${
            showAmendmentLink
              ? `<div style="background:#fde8e6;border:1px solid #f5b7b1;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#7b241c;">Please amend the required information or documents based on the stated remarks before resubmitting your MTV application.</p><a class="email-button" href="${amendmentUrl}" style="${primaryButtonStyle}">Open amendment form</a></div>`
              : ""
          }
          ${
            showOrderOfPayment
              ? `<div style="background:#e6f2ec;border:1px solid #cfe5d8;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#1a5c32;font-weight:bold;">Your Order of Payment is ready.</p><p style="margin:0 0 12px;color:#555;">It is attached to this email and can also be downloaded from the Application Status page.</p><p style="margin:0 0 12px;color:#555;">Already paid? Send your proof of payment and payment reference number using the link below.</p><a class="email-button" href="${orderOfPaymentUrl}" style="${primaryButtonStyle}margin-right:8px;">Download Order of Payment</a><a class="email-button" href="${paymentSubmissionUrl}" style="${secondaryButtonStyle}">Submit Proof of Payment</a></div>`
              : ""
          }
          ${
            showProofAmendmentLink
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#795548;font-weight:bold;">Your proof of payment needs correction.</p><p style="margin:0 0 12px;color:#555;">Please upload the corrected proof of payment and payment reference number.</p><a class="email-button" href="${paymentSubmissionUrl}" style="${primaryButtonStyle}">Update Proof of Payment</a></div>`
              : ""
          }
          <p style="margin:0 0 14px;">You can view your latest application status at the <a href="${siteUrl}/application-status?ref=${encodeURIComponent(reference)}" style="color:#1a5c32;font-weight:bold;word-break:break-word;">Application Status page</a>.</p>
          <p style="margin:24px 0 0;">Best regards,<br/><strong>NMIS Regional Technical Operation Center III</strong><br/>San Fernando, Pampanga</p>
        </div>
      </div>
    `,
  });
}

export async function sendApplicationStatusUpdateToNMIS(applicationData) {
  const transport = getTransporter();
  const recipient = getOfficeRecipient();

  if (!recipient) {
    throw new Error("Missing CONTACT_RECIPIENT_EMAIL or Gmail sender address.");
  }

  const {
    reference,
    registeredOwner,
    email,
    contact,
    status,
    remarks,
    plate,
    vehicleType,
    businessName,
    folderUrl,
  } = applicationData;

  return transport.sendMail({
    from: getDefaultSender(),
    to: recipient,
    replyTo: formatMailAddress(registeredOwner, email),
    subject: `[MTV Portal] Application Action Recorded - ${reference}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(650)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">MTV Application Action Recorded</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <div style="background:#e6f2ec;border-radius:8px;padding:16px;margin-bottom:22px;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p class="email-code" style="margin:4px 0 12px;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:1px;word-break:break-word;">${reference}</p>
            <p style="margin:0;font-size:14px;color:#555;">Recorded Action</p>
            <p style="margin:8px 0 0;font-size:16px;color:#1a5c32;"><strong>${status}</strong></p>
          </div>
          <table style="${tableStyle}">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Registered Owner</td><td style="padding:6px 0;font-weight:bold;">${registeredOwner || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${email ? `<a href="mailto:${email}">${email}</a>` : "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Contact Number</td><td style="padding:6px 0;">${contact || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Plate Number</td><td style="padding:6px 0;">${plate || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Vehicle Type</td><td style="padding:6px 0;">${vehicleType || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Business Name</td><td style="padding:6px 0;">${businessName || "Not provided"}</td></tr>
          </table>
          ${
            remarks
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 6px;font-weight:bold;color:#795548;">Admin Remarks</p><p style="margin:0;color:#555;line-height:1.55;">${remarks}</p></div>`
              : ""
          }
          ${
            folderUrl
              ? `<p style="margin:0 0 14px;"><a href="${folderUrl}" style="color:#1a5c32;font-weight:bold;word-break:break-word;">Open application documents in Google Drive</a></p>`
              : ""
          }
          <p style="margin:24px 0 0;font-size:13px;color:#888;">This is an automated notification from the MTV Portal System.</p>
        </div>
      </div>
    `,
  });
}

export async function sendGHPCompletion(email, name, certNumber, score) {
  const transport = getTransporter();

  return transport.sendMail({
    from: getDefaultSender(),
    to: formatMailAddress(name, email),
    subject: `GHP Certificate - ${certNumber}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">GHP Orientation Complete</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 14px;">Dear <strong>${name}</strong>,</p>
          <p style="margin:0 0 14px;">Congratulations! You have successfully completed the GHP Orientation.</p>
          <p style="margin:0 0 10px;"><strong>Certificate Number:</strong> <span style="word-break:break-word;">${certNumber}</span></p>
          <p style="margin:0 0 14px;"><strong>Score:</strong> ${score}%</p>
          <p style="margin:0 0 14px;">You can now proceed with your MTV application.</p>
          <p style="margin:24px 0 0;">Best regards,<br/><strong>NMIS RTOC III</strong></p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationResult(email, name, plate, status) {
  const transport = getTransporter();

  return transport.sendMail({
    from: getDefaultSender(),
    to: formatMailAddress(name, email),
    subject: `Vehicle Verification Result - ${plate}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">Vehicle Verification Result</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 14px;">Dear ${name},</p>
          <p style="margin:0 0 10px;"><strong>Plate Number:</strong> ${plate}</p>
          <p style="margin:0 0 14px;"><strong>Status:</strong> <strong style="color:${status === "Verified" ? "green" : "red"}">${status}</strong></p>
          <p style="margin:24px 0 0;">Best regards,<br/><strong>NMIS RTOC III</strong></p>
        </div>
      </div>
    `,
  });
}

export async function sendContactReply(email, subject, message) {
  const transport = getTransporter();

  return transport.sendMail({
    from: getDefaultSender(),
    to: email,
    subject: `Re: ${subject}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">Message Received</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 14px;">Thank you for contacting MTV Portal. We have received your message and will respond shortly.</p>
          <p style="margin:0 0 8px;"><strong>Your Message:</strong></p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:14px;color:#555;line-height:1.55;word-break:break-word;">${message}</div>
          <p style="margin:24px 0 0;">Best regards,<br/><strong>NMIS RTOC III</strong></p>
        </div>
      </div>
    `,
  });
}

export async function sendContactNotification({
  name,
  email,
  phone,
  subject,
  message,
}) {
  const transport = getTransporter();
  const recipient = getOfficeRecipient();

  if (!recipient) {
    throw new Error("Missing CONTACT_RECIPIENT_EMAIL or Gmail sender address.");
  }

  return transport.sendMail({
    from: getDefaultSender(),
    to: recipient,
    replyTo: formatMailAddress(name, email),
    subject: `MTV Portal Contact: ${subject}`,
    html: `
      ${EMAIL_CSS}
      <div class="email-shell" style="${shellStyle(600)}">
        <div class="email-header" style="${headerStyle}">
          <h1 class="email-title" style="${titleStyle}">New Contact Message</h1>
        </div>
        <div class="email-body" style="${bodyStyle}">
          <p style="margin:0 0 10px;"><strong>Name:</strong> ${name}</p>
          <p style="margin:0 0 10px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#1a5c32;word-break:break-word;">${email}</a></p>
          <p style="margin:0 0 10px;"><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p style="margin:0 0 14px;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin:0 0 8px;"><strong>Message:</strong></p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:14px;color:#555;line-height:1.55;word-break:break-word;">${message}</div>
        </div>
      </div>
    `,
  });
}
