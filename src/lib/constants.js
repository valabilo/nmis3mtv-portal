/**
 * lib/constants.js
 * App-wide constants for the MTV Portal System.
 */

export const APP_NAME = "MTV Portal System";
export const AGENCY_NAME = "National Meat Inspection Service";
export const REGION = "Regional Technical Operation Center III";
export const COPYRIGHT = `${new Date().getFullYear()} NMIS RTOC III. All rights reserved.`;

export const NAV_ITEMS = [
  { id: "home", href: "/", icon: "", label: "Home" },
  { id: "guidelines", href: "/guidelines", icon: "", label: "Guidelines" },
  { id: "ghp", href: "/ghp", icon: "", label: "GHP Orientation" },
  {
    id: "requirements",
    href: "/requirements",
    icon: "",
    label: "Requirements",
  },
  { id: "apply", href: "/apply", icon: "", label: "MTV Application" },
  { id: "verify", href: "/verify", icon: "", label: "Verify MTV" },
  { id: "banned", href: "/banned", icon: "", label: "Banned List" },
  { id: "contact", href: "/contact", icon: "", label: "Contact" },
];

export const OFFICE_INFO = {
  name: "National Meat Inspection Service Regional Technical Operation Center III",
  address:
    "Diosdado Macapagal Government Center, Brgy. Maimpis, San Fernando, Pampanga",
  addressLines: [
    "Diosdado Macapagal Government Center, Brgy. Maimpis, San Fernando, Pampanga",
  ],
  mapEmbedUrl:
    "https://www.google.com/maps?q=Diosdado%20Macapagal%20Government%20Center%2C%20Brgy.%20Maimpis%2C%20San%20Fernando%2C%20Pampanga&output=embed",
  phone: "(045) 455-4532",
  email: "rtoc3@nmis.gov.ph",
  hours: "Monday-Friday: 8:00 AM - 5:00 PM (Except Public Holidays)",
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png";
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export const DEMO_FAQS = [
  {
    q: "How long does the accreditation process take?",
    a: "The accreditation process typically takes 5-10 working days after submission of complete requirements.",
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
    a: "Required documents include the application form, GHP completion or attendance certificate, CR, updated OR, proof of ownership or legal possession, health certificates, and vehicle photos.",
  },
  {
    q: "How can I check the status of my application?",
    a: "You can check your application status in the MTV Application page using your reference number.",
  },
];
