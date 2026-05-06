import { randomInt } from "crypto";

export function generateRefNumber() {
  const year = new Date().getFullYear();
  const random = String(randomInt(0, 1000000)).padStart(6, "0");
  return `MTV-${year}-${random}`;
}

export function validateRefNumber(refNumber) {
  const pattern = /^MTV-\d{4}-\d{5,6}$/;
  return pattern.test(refNumber);
}
