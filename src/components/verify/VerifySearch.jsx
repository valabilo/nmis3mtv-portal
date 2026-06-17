"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/ui/StatusTag";
import { normalise } from "@/lib/utils";
import styles from "./VerifySearch.module.css";

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpiringSoon(value, status) {
  if (
    !value ||
    ["Cancelled", "Expired", "Inactive", "Revoked", "Suspended"].includes(status)
  ) {
    return false;
  }

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return expiry >= today && expiry <= addMonths(today, 2);
}

function StatusWithExpiry({ status, expiry }) {
  return (
    <span className={styles.statusStack}>
      <StatusTag status={status || "Active"} />
      {isExpiringSoon(expiry, status) ? (
        <span className={styles.expiringBadge}>Expiring soon</span>
      ) : null}
    </span>
  );
}

function accreditationMessage(status) {
  if (status === "Active") {
    return "This vehicle is currently ACCREDITED and authorized to transport meat.";
  }

  if (status === "Cancelled") {
    return "This vehicle's accreditation has been cancelled.";
  }

  if (status === "Suspended") {
    return "This vehicle's accreditation is currently suspended.";
  }

  if (status === "Revoked") {
    return "This vehicle's accreditation has been revoked.";
  }

  if (status === "Expired") {
    return "This vehicle's accreditation has expired.";
  }

  return `This vehicle's accreditation status is ${status.toLowerCase()}.`;
}

export default function VerifySearch({ data, showToast, initialQ = "" }) {
  const [query, setQuery] = useState(initialQ);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQ) runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function runSearch(q = query) {
    const val = normalise(q);
    if (!val) {
      showToast("Please enter a plate number or reference number.", true);
      return;
    }
    if (!data.length) {
      showToast("Data is still loading, please try again.");
      return;
    }

    const found = data.find(
      (r) =>
        normalise(r.reference || r.registration_no || "").includes(val) ||
        normalise(r.plate || r.plate_no || r.plate_number || "").includes(val) ||
        normalise(r.business || r.business_name || "").includes(val),
    );
    setResult(found ?? false);
    setSearched(true);
  }

  const stat = result?.status || "Active";
  const expiry = result?.expiry || result?.expiry_date;

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        <h2>Search MTV Record</h2>
        <p>Enter the plate number or business name to look up accreditation status.</p>
        <div className={styles.row}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="e.g. ABC 1234"
            aria-label="Search by plate number or business name"
          />
          <button className="btn btn-primary" onClick={() => runSearch()}>
            Search
          </button>
        </div>
        <p className={styles.tip}>Tip: Search is not case-sensitive.</p>
      </div>

      {searched && result === false && (
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>No record found.</p>
          <p>The plate number or business name you entered does not match any accredited MTV in our records.</p>
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <h3>{result.plate || result.plate_no} - {result.business || result.business_name}</h3>
            <StatusWithExpiry status={stat} expiry={expiry} />
          </div>
          <div className={styles.resultBody}>
            <div className={styles.resultGrid}>
              {[
                ["Registration No.", result.reference || result.registration_no],
                ["Plate Number", result.plate || result.plate_no],
                ["Business Name", result.business || result.business_name],
                ["Owner", result.owner],
                ["Address", result.address],
                ["Date Issued", result.dateIssued || result.date_issued],
                ["Expiry Date", expiry],
                ["Status", <StatusWithExpiry key="s" status={stat} expiry={expiry} />],
              ].map(([label, val]) => (
                <div key={label} className={styles.resultItem}>
                  <label>{label}</label>
                  <p>{val || "-"}</p>
                </div>
              ))}
            </div>
            <div className={stat === "Active" ? styles.alertActive : styles.alertInactive}>
              {accreditationMessage(stat)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
