/**
 * data/requiredDocs.js
 * List of required documents for MTV application.
 */

export const REQUIRED_DOCS = [
  {
    id: "application_form",
    name: "Duly Accomplished and Notarized MTV Application Form",
    description: "Application form completed and notarized as prescribed by NMIS regulations.",
    required: true,
  },
  {
    id: "company_registration",
    name: "Valid Proof of Company Registration",
    description: "Complete copy of the DTI Certificate of Business Name Registration for sole proprietorships, or SEC registration documents for partnerships/corporations, where applicable.",
    required: true,
  },
  {
    id: "certificate_registration",
    name: "Valid Certificate of Registration (COR)",
    description: "LTO Certificate of Registration under the name of the owner, applicant, or company.",
    required: true,
  },
  {
    id: "temporary_plate_authorization",
    name: "Temporary or Improvised Plate Authorization",
    description: "LTO certificate authorizing use of a temporary or improvised plate number, for vehicles using a temporary or unofficial plate number, where applicable.",
    required: false,
  },
  {
    id: "official_receipt",
    name: "Updated Official Receipt (OR)",
    description: "Updated LTO vehicle registration official receipt.",
    required: true,
  },
  {
    id: "ghp_attendance",
    name: "GHP Certificate of Completion or Attendance",
    description: "Certificate for the driver and helper (pahinante) on Good Hygienic Practices in meat/food handling conducted by the National Meat Inspection Service.",
    required: true,
  },
  {
    id: "health_certificates",
    name: "Valid Health Certificate(s)",
    description: "Health certificates for the driver and helper issued by the City or Municipal Health Office.",
    required: true,
  },
  {
    id: "vehicle_photos",
    name: "Clear Colored Vehicle Photos",
    description: "Clear colored 7 × 5 inch (or 5R) photos: front view showing plate number, left and right views, closed-back view showing plate number, and open-back view showing the MTV compartment.",
    required: true,
  },
  {
    id: "meat_establishment_contract",
    name: "Signed Certification or Contract from the Licensed Meat Establishment",
    description: "Certification or contract indicating that the MTV will be engaged to render service for the licensed meat establishment.",
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
