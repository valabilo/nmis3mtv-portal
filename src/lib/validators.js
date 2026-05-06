/**
 * lib/validators.js
 * Form validation utilities
 */

export function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function validatePhoneNumber(phone) {
  // Philippine phone format
  const pattern = /^(\+63|0)?9\d{9}$/;
  return pattern.test(phone.replace(/\D/g, ""));
}

export function validatePlateNumber(plate) {
  // Flexible plate validation - allows various formats
  const plate_clean = plate.replace(/\s/g, "");
  return plate_clean.length >= 4 && plate_clean.length <= 10;
}

export function validateYear(year) {
  const yearNum = parseInt(year);
  const currentYear = new Date().getFullYear();
  return yearNum >= 1950 && yearNum <= currentYear + 1;
}

export function validateCapacity(capacity) {
  const cap = parseFloat(capacity);
  return cap > 0 && cap <= 50000;
}

export function validateAddress(address) {
  return Boolean(address && address.trim());
}

export function validateName(name) {
  return name && name.trim().length >= 2;
}
