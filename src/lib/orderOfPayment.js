import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

const DEFAULT_PAYMENT_AMOUNT = 300;
const DEFAULT_PURPOSE = "MTV Payment (NIU 4999)";
const DEFAULT_PAYMENT_CODE = "NIU 4999";
const DEFAULT_ENTITY = "NATIONAL MEAT INSPECTION SERVICE";
const DEFAULT_FUND_CLUSTER = "101";
const DEFAULT_COLLECTING_OFFICE = "Cash/Treasury Unit";
const DEFAULT_BANK = "Landbank of the Philippines";
const DEFAULT_AUTHORIZED_OFFICIAL = "DR. MA. THERESA D. MAGDARAO";
const DEFAULT_OFFICIAL_TITLE = "Designate Admin Officer";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function numericParts(value) {
  return String(value || "").replace(/\D/g, "");
}

function serialDigits(reference) {
  return numericParts(reference).slice(-5).padStart(5, "0");
}

function billNumber(reference) {
  const digits = serialDigits(reference);
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function licenseNumber(reference, date) {
  const text = String(reference || "").trim();
  if (/^R3-\d{4}-\d{2}-\d{4,}$/i.test(text)) return text.toUpperCase();

  const issued =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `R3-${issued.getFullYear()}-${String(issued.getMonth() + 1).padStart(2, "0")}-${serialDigits(reference)}`;
}

function parseStatusHistory(value) {
  if (Array.isArray(value)) return value;

  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function paymentDate(application) {
  const history = parseStatusHistory(
    application.statusHistory || application.status_history,
  );
  const paymentEntry = [...history]
    .reverse()
    .find((entry) => String(entry?.status || "").trim() === "For Payment");
  const candidate =
    paymentEntry?.timestamp || application.updatedAt || application.timestamp;
  const date = candidate ? new Date(candidate) : new Date();

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateFromValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function longDate(date) {
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortDate(date) {
  return date
    .toLocaleDateString("en-PH", {
      year: "2-digit",
      month: "short",
      day: "2-digit",
    })
    .replace(/ /g, "-");
}

function amountValue() {
  const amount = Number(
    process.env.MTV_ORDER_PAYMENT_AMOUNT || DEFAULT_PAYMENT_AMOUNT,
  );
  return Number.isFinite(amount) && amount > 0
    ? amount
    : DEFAULT_PAYMENT_AMOUNT;
}

function parseAmount(value, fallback) {
  const amount = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

function amountWords(number) {
  const ones = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const whole = Math.floor(Math.abs(number));

  if (whole < 20) return ones[whole];
  if (whole < 100) {
    return `${tens[Math.floor(whole / 10)]}${whole % 10 ? ` ${ones[whole % 10]}` : ""}`;
  }
  if (whole < 1000) {
    return `${ones[Math.floor(whole / 100)]} hundred${whole % 100 ? ` ${amountWords(whole % 100)}` : ""}`;
  }
  if (whole < 10000) {
    return `${ones[Math.floor(whole / 1000)]} thousand${whole % 1000 ? ` ${amountWords(whole % 1000)}` : ""}`;
  }

  return String(whole);
}

export function orderOfPaymentFilename(reference) {
  const safeRef = String(reference || "mtv-application")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `order-of-payment-${safeRef || "mtv-application"}.pdf`;
}

function collectPdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function line(doc, x1, y, x2) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
}

function labeledLine(doc, label, value, x, y, width, options = {}) {
  doc
    .font("Helvetica-Bold")
    .fontSize(options.labelSize || 10)
    .text(label, x, y);
  const labelWidth = doc.widthOfString(label) + 8;
  const valueX = x + labelWidth;
  const lineY = y + 13;
  line(doc, valueX, lineY, x + width);
  doc
    .font("Helvetica-Bold")
    .fontSize(options.valueSize || 10)
    .text(String(value || ""), valueX + 3, y, {
      width: x + width - valueX - 6,
      align: options.align || "center",
    });
}

function valueLine(doc, value, x, y, width, hint = "") {
  line(doc, x, y + 14, x + width);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(String(value || ""), x + 3, y, {
      width: width - 6,
      align: "center",
    });
  if (hint) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text(hint, x, y + 17, {
        width,
        align: "center",
      });
  }
}

export async function generateOrderOfPaymentPdf(
  application = {},
  onlinePayment = {},
  options = {},
) {
  const data = buildOrderOfPaymentData(application, onlinePayment);
  const statusUrl = options.statusUrl || "";
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 36, bottom: 36, left: 42, right: 42 },
    bufferPages: true,
  });
  const bufferPromise = collectPdfBuffer(doc);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  doc.font("Helvetica").fontSize(10).fillColor("black");
  labeledLine(doc, "Entity Name:", data.entityName, left, 48, 280);
  labeledLine(doc, "Fund Cluster:", data.fundCluster, left, 68, 280, {
    align: "left",
  });
  labeledLine(doc, "Serial No.", data.serialNo, 350, 48, 190);
  labeledLine(doc, "Date:", data.dateLong, 350, 68, 190);

  doc
    .font("Times-Bold")
    .fontSize(16)
    .text("ORDER OF PAYMENT", left, 108, { width, align: "center" });

  doc.font("Times-Bold").fontSize(11).text("The Collecting Office", left, 144);
  doc.font("Times-Roman").fontSize(11).text(data.collectingOffice, left, 158);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text("Please issue Official Receipt in favor of", left, 202);
  valueLine(doc, data.owner, left + 210, 198, 330, "(Name of Payor)");
  valueLine(
    doc,
    data.address,
    left + 84,
    236,
    456,
    "(Address/Office of Payor)",
  );

  doc.font("Helvetica").fontSize(10).text("in the amount of", left, 286);
  valueLine(doc, data.amountPeso, left + 88, 282, 100);
  valueLine(doc, data.amountWords, left + 220, 282, 320, "(in words)");

  doc.font("Helvetica").fontSize(10).text("for the payment of", left, 338);
  valueLine(doc, data.purpose, left + 105, 334, 435, "(Purpose)");

  doc.font("Helvetica").fontSize(10).text("per Bill No.", left, 390);
  valueLine(doc, data.billNo, left + 66, 386, 70);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("dated", left + 150, 390);
  valueLine(doc, data.dateShort, left + 188, 386, 150);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text("Please deposit the collections under Bank Account/s:", left, 438);
  valueLine(doc, "", left, 478, 82);
  valueLine(doc, data.bank, left + 115, 478, 245);
  valueLine(doc, data.amountPeso, left + 392, 478, 148);
  valueLine(doc, "", left, 502, 82);
  valueLine(doc, "", left + 115, 502, 245);
  valueLine(doc, "", left + 392, 502, 148);
  valueLine(doc, "", left, 526, 82);
  valueLine(doc, "", left + 115, 526, 245);
  valueLine(doc, "", left + 392, 526, 148);

  valueLine(doc, data.official, right - 262, 586, 262);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(data.officialTitle, right - 262, 606, {
      width: 262,
      align: "center",
    });
  doc.text("Signature over Printed Name", right - 262, 622, {
    width: 262,
    align: "center",
  });
  doc.text("Authorized Official", right - 262, 636, {
    width: 262,
    align: "center",
  });

  doc.addPage();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Company No.: ${data.companyNo}`, left, 42, {
      width,
      align: "right",
    });

  const rows = [
    ["Date:", data.dateLong],
    ["Registered Owner:", data.owner],
    ["License to Operate No.:", data.licenseNo],
    ["Number of Units / Meat Van:", data.units],
    ["Amount:", data.amountPeso],
  ];
  let y = 96;
  rows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(10).text(label, left, y);
    valueLine(doc, value, left + 170, y - 4, 360);
    y += 28;
  });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(
      "Please see the step-by-step procedure on how to pay online:",
      left,
      260,
    );
  const steps = [
    "Go to Landbank Electronic Payment System (EPS) portal.",
    "Click Pay Now.",
    "Select Merchant National Meat Inspection Service (NMIS).",
    'Select Transaction "LICENSING FEE".',
    "Select Payment Gateway Option (Cash Payment and GCash, GrabPay via MYEG).",
    "Type your Email Address.",
    "Type the name of client as specified in Application Form.",
    'License to Operate No. Type the "RTOC-3 / No.".',
    'Type "MTV REGISTRATION" on the nature of payment.',
    "Type Date Payment using this format (MM/DD/YEAR).",
    "Type the CAPTCHA Code as shown in the legend.",
    "Check Agree on Terms and Condition.",
    "Select Submit.",
    "Choose and select your preferred payment method.",
    "Key-in your PIN Number.",
    "Click Submit.",
    "Press OK.",
    "Wait for the payment confirmation from Landbank.",
    "Print/Screenshot the Payment confirmation.",
  ];
  doc.font("Helvetica").fontSize(9);
  y = 290;
  steps.forEach((step, index) => {
    doc.text(`${index + 1}. ${step}`, left + 10, y, { width: width - 20 });
    y += 17;
  });

  if (statusUrl) {
    y += 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        "Already paid? Submit your proof of payment and payment reference number here:",
        left,
        y,
      );
    y += 16;
    doc
      .fillColor("blue")
      .font("Helvetica")
      .text(statusUrl, left, y, { link: statusUrl, underline: true, width });
    doc.fillColor("black");
  }

  doc.end();
  return bufferPromise;
}

export function buildOrderOfPaymentData(application = {}, onlinePayment = {}) {
  const date =
    dateFromValue(onlinePayment.date_issued || onlinePayment.issued_date) ||
    paymentDate(application);
  const reference = application.reference || application.ref_number || "";
  const amount = amountValue();
  const paymentAmount = parseAmount(onlinePayment.amount, amount);
  const owner =
    onlinePayment.name_of_payor ||
    application.registeredOwner ||
    application.registered_owner ||
    application.applicant ||
    "";
  const paymentCode =
    onlinePayment.payment_code ||
    process.env.MTV_ORDER_PAYMENT_CODE ||
    DEFAULT_PAYMENT_CODE;
  const purpose =
    onlinePayment.purpose ||
    process.env.MTV_ORDER_PAYMENT_PURPOSE ||
    DEFAULT_PURPOSE;

  return {
    date,
    dateLong: longDate(date),
    dateShort: shortDate(date),
    reference: onlinePayment.reference_number || reference,
    owner,
    address:
      onlinePayment.address_office_of_payor ||
      application.businessAddress ||
      application.baddress ||
      application.address ||
      application.province ||
      "",
    email: application.email || "",
    contact: "0933-8263-760" || "",
    licenseNo: onlinePayment.serial_no || licenseNumber(reference, date),
    serialNo: onlinePayment.serial_no || licenseNumber(reference, date),
    codeNo: onlinePayment.code || billNumber(reference),
    billNo: onlinePayment.code || billNumber(reference),
    units: application.units || "1",
    amount: paymentAmount,
    amountPeso: `P${paymentAmount.toFixed(2)}`,
    amountWords: amountWords(paymentAmount),
    purpose,
    paymentCode,
    entityName: process.env.MTV_ORDER_PAYMENT_ENTITY || DEFAULT_ENTITY,
    fundCluster:
      process.env.MTV_ORDER_PAYMENT_FUND_CLUSTER || DEFAULT_FUND_CLUSTER,
    collectingOffice:
      process.env.MTV_ORDER_PAYMENT_COLLECTING_OFFICE ||
      DEFAULT_COLLECTING_OFFICE,
    bank: process.env.MTV_ORDER_PAYMENT_BANK || DEFAULT_BANK,
    official:
      process.env.MTV_ORDER_PAYMENT_OFFICIAL || DEFAULT_AUTHORIZED_OFFICIAL,
    officialTitle:
      process.env.MTV_ORDER_PAYMENT_OFFICIAL_TITLE || DEFAULT_OFFICIAL_TITLE,
    companyNo:
      process.env.MTV_ORDER_PAYMENT_COMPANY_NO || application.contact || "",
    dateOfPayment: onlinePayment.date_of_payment || "",
  };
}

export function generateOrderOfPaymentHtml(
  application = {},
  onlinePayment = {},
) {
  const data = buildOrderOfPaymentData(application, onlinePayment);
  const e = escapeHtml;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Order of Payment - ${e(data.reference)}</title>
  <style>
    @page { size: letter; margin: 0.45in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 14px; }
    .page { width: 7.6in; min-height: 9.8in; margin: 0 auto; padding: 0.05in 0; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 8px; }
    .lineRow { display: grid; grid-template-columns: max-content 1fr; align-items: end; gap: 8px; margin: 4px 0; }
    .line { min-height: 18px; border-bottom: 1px solid #000; font-weight: 700; text-align: center; }
    h1 { margin: 12px 0 16px; text-align: center; font-family: "Times New Roman", serif; font-size: 18px; }
    .office { margin: 0 0 20px; font-family: "Times New Roman", serif; }
    .office strong { display: block; margin-bottom: 4px; }
    .centerLine { display: grid; grid-template-columns: max-content 1fr; align-items: end; gap: 10px; margin: 14px 0 0; }
    .hint { display: block; margin-top: 3px; text-align: center; font-family: "Times New Roman", serif; font-size: 12px; font-style: italic; font-weight: 400; }
    .amountGrid { display: grid; grid-template-columns: 118px 1fr; gap: 36px; align-items: end; margin-top: 22px; }
    .amountBox, .wordsBox, .purposeBox { border-bottom: 1px solid #000; min-height: 22px; text-align: center; font-weight: 700; }
    .amountLabel, .purposeRow { display: grid; grid-template-columns: max-content 1fr; gap: 8px; align-items: end; margin-top: 24px; }
    .billRow { display: grid; grid-template-columns: max-content 72px max-content 160px 1fr; gap: 8px; align-items: end; margin-top: 28px; }
    .billLine { border-bottom: 1px solid #000; min-height: 18px; text-align: center; font-weight: 700; }
    .bankTitle { margin-top: 18px; }
    .bankGrid { display: grid; grid-template-columns: 84px 1fr 158px; gap: 34px; margin-top: 24px; }
    .bankGrid div { border-bottom: 1px solid #000; min-height: 20px; text-align: center; }
    .signature { width: 262px; margin: 34px 0 0 auto; text-align: center; }
    .signature strong { display: block; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 12px; }
    .signature span { display: block; margin-top: 5px; font-size: 12px; }
    .steps { padding: 0.2in 0.4in; font-size: 14px; }
    .company { text-align: right; margin-bottom: 34px; }
    .formGrid { display: grid; grid-template-columns: 180px 1fr; gap: 9px; max-width: 560px; }
    .formGrid div:nth-child(even) { border-bottom: 1px solid #000; color: #f00; font-weight: 700; padding-left: 3px; }
    .stepsIntro { margin: 24px 0; }
    ol { margin: 0 0 0 28px; padding-left: 16px; line-height: 1.55; }
    .green { color: #008c3a; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <section class="page">
    <div class="meta">
      <div>
        <div class="lineRow"><strong>Entity Name:</strong><div class="line">${e(data.entityName)}</div></div>
        <div class="lineRow"><strong>Fund Cluster:</strong><div class="line" style="text-align:left;">${e(data.fundCluster)}</div></div>
      </div>
      <div>
        <div class="lineRow"><strong>Serial No.</strong><div class="line">${e(data.serialNo)}</div></div>
        <div class="lineRow"><strong>Date:</strong><div class="line">${e(data.dateLong)}</div></div>
      </div>
    </div>
    <h1>ORDER OF PAYMENT</h1>
    <p class="office"><strong>The Collecting Office</strong>${e(data.collectingOffice)}</p>
    <div class="centerLine">
      <span>Please issue Official Receipt in favor of</span>
      <div><div class="line">${e(data.owner)}</div><span class="hint">(Name of Payor)</span></div>
    </div>
    <div style="margin-left:126px;margin-top:14px;">
      <div class="line">${e(data.address)}</div>
      <span class="hint">(Address/Office of Payor)</span>
    </div>
    <div class="amountGrid">
      <div><span>in the amount of</span><div class="amountBox">${e(data.amountPeso)}</div></div>
      <div><div class="wordsBox">${e(data.amountWords)}</div><span class="hint">(in words)</span></div>
    </div>
    <div class="purposeRow">
      <span>for the payment of</span>
      <div><div class="purposeBox">${e(data.purpose)}</div><span class="hint">(Purpose)</span></div>
    </div>
    <div class="billRow">
      <span>per Bill No.</span><div class="billLine">${e(data.billNo)}</div>
      <span>dated</span><div class="billLine">${e(data.dateShort)}</div><span></span>
    </div>
    <p class="bankTitle">Please deposit the collections under Bank Account/s:</p>
    <div class="bankGrid"><div></div><div>${e(data.bank)}</div><div>${e(data.amountPeso)}</div></div>
    <div class="bankGrid" style="margin-top:0;"><div></div><div></div><div></div></div>
    <div class="bankGrid" style="margin-top:0;"><div></div><div></div><div></div></div>
    <div class="signature">
      <strong>${e(data.official)}</strong>
      <span>${e(data.officialTitle)}</span>
      <span>Signature over Printed Name</span>
      <span>Authorized Official</span>
    </div>
  </section>
  <section class="page steps">
    <div class="company">Company No.: ${e(data.companyNo)}</div>
    <div class="formGrid">
      <div>Date:</div><div>${e(data.dateLong)}</div>
      <div>Registered Owner:</div><div>${e(data.owner)}</div>
      <div>License to Operate No.:</div><div>${e(data.licenseNo)}</div>
      <div>Number of Units / Meat Van:</div><div>${e(data.units)}</div>
      <div>Amount:</div><div>${e(data.amountPeso)}</div>
    </div>
    <p class="stepsIntro">Please see the step-by-step procedure on how to pay online:</p>
    <ol>
      <li>Go to <span class="green">Landbank Electronic Payment System (EPS) portal.</span></li>
      <li>Click Pay Now</li>
      <li>Select Merchant <span class="green">National Meat Inspection Service (NMIS)</span></li>
      <li>Select Transaction "LICENSING FEE"</li>
      <li>Select Payment Gateway Option (Cash Payment and GCash, GrabPay via MYEG)</li>
      <li>Type your Email Address</li>
      <li>Type the name of client as specified in Application Form</li>
      <li>License to Operate No. Type the "RTOC-3 / No."</li>
      <li>Type "MTV REGISTRATION" on the nature of payment</li>
      <li>Type Date Payment using this format (MM/DD/YEAR)</li>
      <li>Type the CAPTCHA Code as shown in the legend</li>
      <li>Check Agree on Terms and Condition</li>
      <li>Select Submit</li>
      <li>Choose and select your preferred payment method</li>
      <li>Key-in your PIN Number</li>
      <li>Click Submit</li>
      <li>Press OK</li>
      <li>Wait for the payment confirmation from Landbank</li>
      <li>Print/Screenshot the Payment confirmation</li>
    </ol>
  </section>
</body>
</html>`;
}
