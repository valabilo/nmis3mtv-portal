"use client";
/**
 * components/apply/Step1Applicant.jsx
 *
 * Step 1 of the MTV application form: Applicant Information.
 * Includes an optional GHP Certificate Number field.
 */

import styles from "./FormSteps.module.css";
import Link from "next/link";

const APPLICATION_TYPES = ["New", "Renewal", "Amendment"];

const REGIONS = [
  { value: "III", label: "Region III - Central Luzon" },
  { value: "NCR", label: "NCR - National Capital Region" },
  { value: "IV-A", label: "Region IV-A - CALABARZON" },
];

const PROVINCES = [
  "Pampanga",
  "Bulacan",
  "Tarlac",
  "Nueva Ecija",
  "Bataan",
  "Zambales",
  "Aurora",
];

export default function Step1Applicant({
  data,
  onChange,
  onNext,
  validatingGhp = false,
}) {
  const f = (id, type = "text") => ({
    id,
    type,
    value: data[id] ?? "",
    onChange: (e) => onChange(id, e.target.value),
  });

  return (
    <div className={styles.body}>
      <h2 className={styles.sectionTitle}>Applicant Information</h2>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="applicationType">
            Type of Application <span className="req">*</span>
          </label>
          <select
            id="applicationType"
            value={data.applicationType}
            onChange={(e) => onChange("applicationType", e.target.value)}>
            {APPLICATION_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="registeredOwner">
            Registered Owner <span className="req">*</span>
          </label>
          <input placeholder="Juan Dela Cruz" {...f("registeredOwner")} />
        </div>
        <div className="form-group">
          <label htmlFor="email">
            Email Address <span className="req">*</span>
          </label>
          <input type="email" placeholder="juan@email.com" {...f("email")} />
        </div>
        <div className="form-group">
          <label htmlFor="contact">
            Contact Number <span className="req">*</span>
          </label>
          <input type="tel" placeholder="09XX-XXX-XXXX" {...f("contact")} />
        </div>
        <div className="form-group full">
          <label htmlFor="address">
            Complete Address <span className="req">*</span>
          </label>
          <textarea
            {...f("address")}
            placeholder="House/Lot No., Street, Barangay, City/Municipality, Province"
          />
        </div>
        <div className="form-group">
          <label htmlFor="region">
            Region <span className="req">*</span>
          </label>
          <select
            id="region"
            value={data.region}
            onChange={(e) => onChange("region", e.target.value)}>
            <option value="">-- Select Region --</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="province">
            Province <span className="req">*</span>
          </label>
          <select
            id="province"
            value={data.province}
            onChange={(e) => onChange("province", e.target.value)}>
            <option value="">-- Select Province --</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          background: "var(--green-pale)",
          border: "1px solid var(--green)",
          borderRadius: "var(--radius)",
          padding: "18px 20px",
          marginBottom: 24,
        }}>
        <div
          style={{
            fontWeight: 800,
            color: "var(--green)",
            marginBottom: 8,
            fontSize: ".95rem",
          }}>
          GHP Certificate Number{" "}
          <span style={{ color: "var(--gray-500)", fontWeight: 600 }}>
            (optional)
          </span>
        </div>
        <p
          style={{
            fontSize: ".85rem",
            color: "var(--gray-700)",
            marginBottom: 12,
            lineHeight: 1.6,
          }}>
          Enter your certificate number if available. You may still proceed
          without this field. If you enter one, it must match a valid NMIS GHP
          certificate control number.
        </p>
        <div className="form-group" style={{ margin: 0 }}>
          <input
            id="ghpCertNumber"
            type="text"
            placeholder="e.g. GHP-2026-123456"
            value={data.ghpCertNumber ?? ""}
            onChange={(e) =>
              onChange("ghpCertNumber", e.target.value.toUpperCase())
            }
            style={{ fontFamily: "monospace", letterSpacing: "1px" }}
          />
          <span className="form-hint">
            Don't have one yet?{" "}
            <Link href="/ghp" style={{ color: "var(--green)", fontWeight: 700 }}>
              Complete GHP Orientation
            </Link>
          </span>
        </div>
      </div>

      <div className="form-footer">
        <span style={{ fontSize: ".85rem", color: "var(--gray-500)" }}>
          <span className="req">*</span> Required fields
        </span>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={validatingGhp}>
          {validatingGhp ? "Validating GHP..." : "Next: Vehicle Details"}
        </button>
      </div>
    </div>
  );
}
