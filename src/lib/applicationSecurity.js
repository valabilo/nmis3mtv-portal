import { REQUIRED_DOCS } from "@/data/requiredDocs";
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import {
  validateAddress,
  validateCapacity,
  validateEmail,
  validateName,
  validatePhoneNumber,
  validatePlateNumber,
  validateYear,
} from "@/lib/validators";

const FIELD_LIMIT = 180;
const TEXTAREA_LIMIT = 800;

export const APPLICATION_FIELDS = [
  "submissionId",
  "applicationType",
  "registeredOwner",
  "email",
  "contact",
  "address",
  "region",
  "province",
  "plate",
  "vtype",
  "vmake",
  "vmodel",
  "vyear",
  "vcolor",
  "vengine",
  "vchassis",
  "crNumber",
  "orNumber",
  "ltoClientId",
  "bodyType",
  "fuelType",
  "cooling",
  "capacity",
  "grossWeight",
  "netCapacity",
  "material",
  "meatEstablishment",
  "intendedRoute",
  "bname",
  "btype",
  "baddress",
  "ghpCertNumber",
];

function cleanValue(value, key) {
  const limit =
    key === "address" || key === "baddress" ? TEXTAREA_LIMIT : FIELD_LIMIT;
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export function sanitizeApplicationFields(raw) {
  return APPLICATION_FIELDS.reduce((acc, key) => {
    acc[key] = cleanValue(raw[key], key);
    return acc;
  }, {});
}

export function validateApplicationFields(data) {
  const missing = [
    "applicationType",
    "registeredOwner",
    "email",
    "contact",
    "address",
    "region",
    "province",
    "plate",
    "vtype",
    "vmake",
    "vmodel",
    "vyear",
    "capacity",
    "meatEstablishment",
    "intendedRoute",
  ].filter((field) => !data[field]);

  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  if (!validateName(data.registeredOwner)) return "Invalid registered owner.";
  if (!validateEmail(data.email)) return "Invalid email address.";
  if (!validatePhoneNumber(data.contact))
    return "Invalid Philippine mobile number.";
  if (!validateAddress(data.address)) return "Invalid address.";
  if (!validatePlateNumber(data.plate)) return "Invalid plate number.";
  if (!validateYear(data.vyear)) return "Invalid vehicle year.";
  if (!validateCapacity(data.capacity)) return "Invalid load capacity.";

  return "";
}

export function validateApplicationFiles(filesByDocId) {
  const missing = REQUIRED_DOCS.filter(
    (doc) => doc.required && !filesByDocId[doc.id],
  );
  if (missing.length) {
    return `Missing required documents: ${missing.map((doc) => doc.name).join(", ")}`;
  }

  for (const [docId, file] of Object.entries(filesByDocId)) {
    if (!REQUIRED_DOCS.some((doc) => doc.id === docId))
      return `Unexpected document field: ${docId}`;
    if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than 5 MB.`;
    if (!ACCEPTED_MIME_TYPES.includes(file.type))
      return `${file.name} must be PDF, JPG, JPEG, or PNG.`;
  }

  return "";
}

export function safeDriveName(value) {
  return cleanValue(value, "name")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 120);
}
