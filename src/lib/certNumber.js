import { randomInt } from "crypto";

export function generateCertNumber() {
  const year = new Date().getFullYear();
  const random = String(randomInt(0, 1000000)).padStart(6, "0");
  return `GHP-${year}-${random}`;
}

export function validateCertNumber(certNumber) {
  const pattern = /^GHP-\d{4}-\d{5,6}$/;
  return pattern.test(certNumber);
}
