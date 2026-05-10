"use client";
/**
 * components/apply/Step1Applicant.jsx
 *
 * Step 1 of the MTV application form: Applicant Information.
 * Includes an optional GHP Certificate Number field.
 */

import styles from "./FormSteps.module.css";
import Link from "next/link";
import SelectField from "./SelectField";

const APPLICATION_TYPES = ["New", "Renewal", "Amendment"];

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
  lockApplicationType = false,
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
          <SelectField
            id="applicationType"
            label="Type of Application"
            required
            value={data.applicationType}
            options={APPLICATION_TYPES.map((type) => ({
              value: type,
              label: type,
            }))}
            onChange={(value) => onChange("applicationType", value)}
            disabled={lockApplicationType}
          />
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
            placeholder="Street, Barangay, City/Municipality, Province"
          />
        </div>
        <div className="form-group">
          <SelectField
            id="region"
            label="Region"
            required
            value="III"
            disabled
            options={[{ value: "III", label: "Region III - Central Luzon" }]}
            onChange={() => {}}
          />
          <span className="form-hint">
            This portal is for NMIS RTOC III — Region III only.
          </span>
        </div>
        <div className="form-group">
          <SelectField
            id="province"
            label="Province"
            required
            value={data.province}
            options={[
              { value: "", label: "-- Select Province --" },
              ...PROVINCES.map((province) => ({
                value: province,
                label: province,
              })),
            ]}
            onChange={(value) => onChange("province", value)}
          />
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
            <Link
              href="/ghp"
              style={{ color: "var(--green)", fontWeight: 700 }}>
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
