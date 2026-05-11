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
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">MTV Portal – Application Submitted</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Dear <strong>${applicantName}</strong>,</p>
          <p>Your MTV accreditation application has been successfully submitted and received by NMIS RTOC III.</p>
          <div style="background:#e6f2ec;border:1px dashed #1a5c32;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#1a5c32;letter-spacing:2px;">${refNumber}</p>
          </div>
          <p>Please keep this reference number for tracking your application status.</p>
          <p>Our team will review your documents and notify you of any updates. Processing typically takes <strong>1-3 working days</strong> after submission of complete requirements.</p>
          <p>You can track your application status at any time by visiting the <a href="${siteUrl}/application-status?ref=${encodeURIComponent(refNumber)}" style="color:#1a5c32;font-weight:bold;">Application Status page</a>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="font-size:13px;color:#888;">If you did not submit this application, please contact us immediately at <a href="mailto:rtoc3@nmis.gov.ph">rtoc3@nmis.gov.ph</a>.</p>
          <p style="margin-top:24px;">Best regards,<br/><strong>NMIS Regional Technical Operation Center III</strong><br/>San Fernando, Pampanga</p>
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
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">New MTV Application Received</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <div style="background:#e6f2ec;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:2px;">${refNumber}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#555;">Application Type: <strong>${applicationType || "New"}</strong></p>
          </div>

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;">Applicant Information</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Registered Owner</td><td style="padding:6px 0;font-weight:bold;">${registeredOwner}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#888;">Contact Number</td><td style="padding:6px 0;">${contact}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Address</td><td style="padding:6px 0;">${address}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Region</td><td style="padding:6px 0;">${region}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Province</td><td style="padding:6px 0;">${province}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">GHP Cert No.</td><td style="padding:6px 0;">${ghpCertNumber || "Not provided"}</td></tr>
          </table>

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;">Vehicle Information</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
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

          <h3 style="color:#1a5c32;border-bottom:2px solid #e6f2ec;padding-bottom:8px;">Business Information</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
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
    previousStatus,
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
    subject: `MTV Application Status Updated - ${reference}`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">MTV Application Status Updated</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Dear <strong>${registeredOwner || "Applicant"}</strong>,</p>
          <p>Your MTV application status has been updated by NMIS RTOC III.</p>
          <div style="background:#e6f2ec;border:1px solid #cfe5d8;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">Reference Number</p>
            <p style="margin:0 0 14px;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:1px;">${reference}</p>
            <p style="margin:0;font-size:14px;color:#555;">Previous Status: <strong>${previousStatus || "Application Received"}</strong></p>
            <p style="margin:8px 0 0;font-size:16px;color:#1a5c32;">New Status: <strong>${status}</strong></p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;width:38%;">Plate Number</td><td style="padding:6px 0;">${plate || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Business Name</td><td style="padding:6px 0;">${businessName || "Not provided"}</td></tr>
          </table>
          ${
            remarks
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 6px;font-weight:bold;color:#795548;">Remarks</p><p style="margin:0;color:#555;">${remarks}</p></div>`
              : ""
          }
          ${
            showAmendmentLink
              ? `<div style="background:#fde8e6;border:1px solid #f5b7b1;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#7b241c;">Please amend the required information or documents and resubmit your MTV application.</p><a href="${amendmentUrl}" style="display:inline-block;background:#1a5c32;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 14px;border-radius:6px;">Open amendment form</a></div>`
              : ""
          }
          ${
            showOrderOfPayment
              ? `<div style="background:#e6f2ec;border:1px solid #cfe5d8;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#1a5c32;font-weight:bold;">Your Order of Payment is ready.</p><p style="margin:0 0 12px;color:#555;">It is attached to this email and can also be downloaded from the Application Status page.</p><p style="margin:0 0 12px;color:#555;">Already paid? Send your proof of payment and payment reference number using the link below.</p><a href="${orderOfPaymentUrl}" style="display:inline-block;background:#1a5c32;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 14px;border-radius:6px;margin-right:8px;">Download Order of Payment</a><a href="${paymentSubmissionUrl}" style="display:inline-block;background:#ffffff;color:#1a5c32;border:1px solid #1a5c32;text-decoration:none;font-weight:bold;padding:10px 14px;border-radius:6px;">Submit Proof of Payment</a></div>`
              : ""
          }
          ${
            showProofAmendmentLink
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 10px;color:#795548;font-weight:bold;">Your proof of payment needs correction.</p><p style="margin:0 0 12px;color:#555;">Please upload the corrected proof of payment and payment reference number.</p><a href="${paymentSubmissionUrl}" style="display:inline-block;background:#1a5c32;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 14px;border-radius:6px;">Update Proof of Payment</a></div>`
              : ""
          }
          <p>You can view your latest application status at the <a href="${siteUrl}/application-status?ref=${encodeURIComponent(reference)}" style="color:#1a5c32;font-weight:bold;">Application Status page</a>.</p>
          <p style="margin-top:24px;">Best regards,<br/><strong>NMIS Regional Technical Operation Center III</strong><br/>San Fernando, Pampanga</p>
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
    previousStatus,
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
    subject: `[MTV Portal] Application Status Updated - ${reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">MTV Application Status Update</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <div style="background:#e6f2ec;border-radius:8px;padding:16px;margin-bottom:22px;">
            <p style="margin:0;font-size:13px;color:#555;">Reference Number</p>
            <p style="margin:4px 0 12px;font-size:22px;font-weight:bold;color:#1a5c32;letter-spacing:1px;">${reference}</p>
            <p style="margin:0;font-size:14px;color:#555;">Previous Status: <strong>${previousStatus || "Application Received"}</strong></p>
            <p style="margin:8px 0 0;font-size:16px;color:#1a5c32;">New Status: <strong>${status}</strong></p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;width:40%;">Registered Owner</td><td style="padding:6px 0;font-weight:bold;">${registeredOwner || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${email ? `<a href="mailto:${email}">${email}</a>` : "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Contact Number</td><td style="padding:6px 0;">${contact || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Plate Number</td><td style="padding:6px 0;">${plate || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Vehicle Type</td><td style="padding:6px 0;">${vehicleType || "Not provided"}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Business Name</td><td style="padding:6px 0;">${businessName || "Not provided"}</td></tr>
          </table>
          ${
            remarks
              ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px;margin-bottom:18px;"><p style="margin:0 0 6px;font-weight:bold;color:#795548;">Admin Remarks</p><p style="margin:0;color:#555;">${remarks}</p></div>`
              : ""
          }
          ${
            folderUrl
              ? `<p><a href="${folderUrl}" style="color:#1a5c32;font-weight:bold;">Open application documents in Google Drive</a></p>`
              : ""
          }
          <p style="margin-top:24px;font-size:13px;color:#888;">This is an automated notification from the MTV Portal System.</p>
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
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">GHP Orientation Complete</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Dear <strong>${name}</strong>,</p>
          <p>Congratulations! You have successfully completed the GHP Orientation.</p>
          <p><strong>Certificate Number:</strong> ${certNumber}</p>
          <p><strong>Score:</strong> ${score}%</p>
          <p>You can now proceed with your MTV application.</p>
          <p>Best regards,<br/><strong>NMIS RTOC III</strong></p>
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
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2>Vehicle Verification Result</h2>
        <p>Dear ${name},</p>
        <p><strong>Plate Number:</strong> ${plate}</p>
        <p><strong>Status:</strong> <strong style="color:${status === "Verified" ? "green" : "red"}">${status}</strong></p>
        <p>Best regards,<br/><strong>NMIS RTOC III</strong></p>
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
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">Message Received</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Thank you for contacting MTV Portal. We have received your message and will respond shortly.</p>
          <p><strong>Your Message:</strong></p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:14px;color:#555;">${message}</div>
          <p style="margin-top:24px;">Best regards,<br/><strong>NMIS RTOC III</strong></p>
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
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
        <div style="background:#1a5c32;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">New Contact Message</h1>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:14px;color:#555;">${message}</div>
        </div>
      </div>
    `,
  });
}
