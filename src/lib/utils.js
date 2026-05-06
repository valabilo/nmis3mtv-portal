/**
 * lib/utils.js
 * Pure helper utilities
 */

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Lowercase + trim for case-insensitive comparisons */
export function normalise(str) {
  return (str || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
}

/** Human-readable file size */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
