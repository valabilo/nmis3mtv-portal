/**
 * data/requiredDocs.js
 * List of required documents for MTV application
 */

export const REQUIRED_DOCS = [
  {
    id: "ghp_cert",
    label: "GHP Certificate of Completion",
    name: "GHP Certificate",
    description: "Valid GHP (Good Hygiene Practices) Certificate",
    required: true,
  },
  {
    id: "or_cr",
    label: "Official Receipt / Certificate of Registration (OR/CR)",
    name: "OR/CR",
    description: "Official Receipt and Certificate of Registration",
    required: true,
  },
  {
    id: "bill_of_lading",
    label: "Sample Bill of Lading",
    name: "Bill of Lading",
    description: "Sample bill of lading for reference",
    required: true,
  },
  {
    id: "inspection_cert",
    label: "LTO Vehicle Inspection Certificate",
    name: "Inspection Certificate",
    description: "LTO Vehicle Inspection Certificate",
    required: true,
  },
  {
    id: "company_permit",
    label: "Business / Company Permit",
    name: "Company/Business Permit",
    description: "Valid business/company permit",
    required: true,
  },
  {
    id: "identification",
    label: "Valid Government-Issued ID",
    name: "Valid ID",
    description: "Government-issued identification (Driver's License, etc.)",
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
  const uploadedIds = Object.keys(uploadedDocs);
  const missing = requiredIds.filter((id) => !uploadedIds.includes(id));
  return {
    valid: missing.length === 0,
    missing: missing.map((id) => REQUIRED_DOCS_MAP[id]),
  };
}
