/**
 * data/requiredDocs.js
 * List of required documents for MTV application.
 */

export const REQUIRED_DOCS = [
  {
    id: "application_form",
    name: "Duly Accomplished MTV Application Form",
    description: "Signed MTV application form.",
    required: true,
  },
  {
    id: "ghp_attendance",
    name: "GHP Completion or Attendance Certificate",
    description: "Optional certificate for owner/manager, driver/helper/pahinante.",
    required: false,
  },
  {
    id: "certificate_registration",
    name: "Certificate of Registration (CR)",
    description: "LTO Certificate of Registration.",
    required: true,
  },
  {
    id: "official_receipt",
    name: "Updated Official Receipt (OR)",
    description: "Updated LTO vehicle registration receipt.",
    required: true,
  },
  {
    id: "ownership_possession",
    name: "Proof of Ownership or Legal Possession",
    description: "Proof of ownership or legal possession of vehicle.",
    required: true,
  },
  {
    id: "health_certificates",
    name: "Health Certificates",
    description: "Health certificates of porter and driver issued by a government physician.",
    required: true,
  },
  {
    id: "vehicle_photos",
    name: "Clear Colored Vehicle Photos",
    description: "7x5 inch photos: front, left/right side, closed back with plate number, and inside view.",
    required: true,
  },
];

export const REQUIRED_DOCS_MAP = REQUIRED_DOCS.reduce((acc, doc) => {
  acc[doc.id] = doc;
  return acc;
}, {});

export function getRequiredDocsForApplication() {
  return REQUIRED_DOCS;
}

export function validateDocuments(uploadedDocs) {
  const requiredIds = REQUIRED_DOCS.filter((d) => d.required).map((d) => d.id);
  const uploadedIds = Object.keys(uploadedDocs ?? {});

  const missing = requiredIds.filter((id) => !uploadedIds.includes(id));
  return {
    valid: missing.length === 0,
    missing: missing.map((id) => REQUIRED_DOCS_MAP[id]),
  };
}
