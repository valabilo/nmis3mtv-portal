/**
 * data/demoData.js
 * Demo / fallback data used when Google Sheets is unavailable
 */

export const DEMO_ACCREDITED = [
  {
    plate: "ABC 1234",
    business: "Juan Dela Cruz Meat Trading",
    type: "Refrigerated Truck",
    owner: "Juan Dela Cruz",
    expiry: "2025-12-31",
    status: "Active",
  },
  {
    plate: "XYZ 5678",
    business: "Santos Meat Supply",
    type: "Insulated Van",
    owner: "Maria Santos",
    expiry: "2025-09-30",
    status: "Active",
  },
  {
    plate: "LMN 9012",
    business: "Cruz Poultry Transport",
    type: "Closed Van",
    owner: "Pedro Cruz",
    expiry: "2024-06-30",
    status: "Expired",
  },
];

export const DEMO_BANNED = [
  {
    plate: "DEF 4321",
    business: "Violator Transport Co.",
    owner: "Carlos Reyes",
    reason: "Unsanitary conditions",
    date: "2024-03-15",
    status: "Banned",
  },
];

export const DEMO_FAQS = [
  {
    q: "How long does the accreditation process take?",
    a: "The accreditation process typically takes 5–10 working days after submission of complete requirements.",
  },
  {
    q: "What is the validity of the MTV Certificate of Registration?",
    a: "The Certificate of Registration (COR) is valid for one (1) year from the date of issuance.",
  },
  {
    q: "Do I need to complete the GHP Orientation before applying?",
    a: "Yes, you need to complete the GHP Orientation and obtain your certificate number before submitting your MTV application.",
  },
  {
    q: "What documents are required for MTV accreditation?",
    a: "Required documents include: GHP Certificate, OR/CR, Bill of Lading, LTO Inspection Certificate, Business Permit, and a valid government-issued ID.",
  },
  {
    q: "How can I check the status of my application?",
    a: "You can check your application status on the Application Status page using your reference number.",
  },
];
