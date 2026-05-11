"use client";

import { Suspense, useMemo, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useMTVData } from "@/hooks/useMTVData";
import { useToast } from "@/hooks/useToast";
import VerifySearch from "@/components/verify/VerifySearch";
import DataTable from "@/components/ui/DataTable";
import StatusTag from "@/components/ui/StatusTag";
import Toast from "@/components/ui/Toast";
import { exportCsv } from "@/lib/csvExport";
import { normalise } from "@/lib/utils";
import styles from "./verify.module.css";

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpiringSoon(value, status) {
  if (!value || status === "Expired" || status === "Revoked") return false;

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return expiry >= today && expiry <= addMonths(today, 2);
}

function yearFromValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return String(date.getFullYear());

  const match = String(value).match(/\b(20\d{2}|19\d{2})\b/);
  return match?.[1] || "";
}

function dateOnlyValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function dateInRange(value, start, end) {
  if (!start && !end) return true;

  const date = dateOnlyValue(value);
  if (!date) return false;

  return (!start || date >= start) && (!end || date <= end);
}

function openNativeDatePicker(event) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Some browsers only allow showPicker during a direct pointer action.
  }
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

const EMPTY_ADVANCED_FILTERS = {
  reference: "",
  plate: "",
  establishment: "",
  establishmentType: "All",
  owner: "",
  status: "All",
  issuedYear: "",
  issuedDateRange: false,
  issuedStartDate: "",
  issuedEndDate: "",
  expiryYear: "",
  expiryDateRange: false,
  expiryStartDate: "",
  expiryEndDate: "",
  expiringSoonOnly: false,
};

const ACCREDITED_EXPORT_COLUMNS = [
  ["Registration No.", "reference"],
  ["Plate No.", "plate"],
  ["Establishment Name", "business"],
  ["Establishment Type", "type"],
  ["Owner", "owner"],
  ["Date Issued", "dateIssued"],
  ["Expiry Date", "expiry"],
  ["Status", (row) => row.status || "Active"],
];

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const { data, loading, error } = useMTVData("accredited");
  const { toastState, showToast } = useToast();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS);

  const establishmentTypes = useMemo(() => {
    return [...new Set(data.map((record) => record.type).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((record) => {
      const status = record.status || "Active";
      const checks = [
        [advancedFilters.reference, record.reference || record.registration_no],
        [advancedFilters.plate, record.plate || record.plate_no || record.plate_number],
        [advancedFilters.establishment, record.business || record.business_name],
        [advancedFilters.owner, record.owner],
      ];
      const textMatches = checks.every(([filterValue, recordValue]) => {
        const filterText = normalise(filterValue);
        return !filterText || normalise(recordValue || "").includes(filterText);
      });
      const matchesStatus =
        advancedFilters.status === "All" || status === advancedFilters.status;
      const matchesEstablishmentType =
        advancedFilters.establishmentType === "All" ||
        normalise(record.type) === normalise(advancedFilters.establishmentType);
      const matchesIssuedYear =
        advancedFilters.issuedDateRange ||
        !advancedFilters.issuedYear ||
        yearFromValue(record.dateIssued || record.date_issued) ===
          advancedFilters.issuedYear.trim();
      const matchesIssuedDateRange =
        !advancedFilters.issuedDateRange ||
        dateInRange(
          record.dateIssued || record.date_issued,
          advancedFilters.issuedStartDate,
          advancedFilters.issuedEndDate,
        );
      const matchesExpiryYear =
        advancedFilters.expiryDateRange ||
        !advancedFilters.expiryYear ||
        yearFromValue(record.expiry || record.expiry_date) ===
          advancedFilters.expiryYear.trim();
      const matchesExpiryDateRange =
        !advancedFilters.expiryDateRange ||
        dateInRange(
          record.expiry || record.expiry_date,
          advancedFilters.expiryStartDate,
          advancedFilters.expiryEndDate,
        );
      const matchesExpiryWindow =
        !advancedFilters.expiringSoonOnly ||
        isExpiringSoon(record.expiry || record.expiry_date, status);

      return (
        textMatches &&
        matchesStatus &&
        matchesEstablishmentType &&
        matchesIssuedYear &&
        matchesIssuedDateRange &&
        matchesExpiryYear &&
        matchesExpiryDateRange &&
        matchesExpiryWindow
      );
    });
  }, [data, advancedFilters]);

  function updateAdvancedFilter(key, value) {
    setAdvancedFilters((current) => ({ ...current, [key]: value }));
  }

  function clearAdvancedFilters() {
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }

  function exportAccreditedRows(rows) {
    if (!rows.length) {
      showToast("No filtered MTV records to export.", true);
      return;
    }

    const parts = exportCsv({
      filenameBase: "accredited-mtvs-central-luzon",
      columns: ACCREDITED_EXPORT_COLUMNS,
      rows,
    });

    showToast(
      parts > 1
        ? `Exported ${rows.length} records in ${parts} CSV files.`
        : `Exported ${rows.length} records to CSV.`,
    );
  }

  const columns = [
    { key: "reference", label: "Registration No.", className: "noWrap" },
    {
      key: "plate",
      label: "Plate No.",
      className: "noWrap",
      render: (v) => <strong>{v}</strong>,
    },
    { key: "type", label: "Establishment Type" },
    { key: "business", label: "Establishment Name" },
    { key: "owner", label: "Owner" },
    { key: "dateIssued", label: "Date Issued", className: "noWrap" },
    { key: "expiry", label: "Expiry Date", className: "noWrap" },
    {
      key: "status",
      label: "Status",
      render: (v, row) => (
        <StatusWithExpiry status={v || "Active"} expiry={row.expiry || row.expiry_date} />
      ),
    },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Verify MTV</h1>
          <p>Check the accreditation status of a Meat Transport Vehicle.</p>
        </div>
      </div>

      <div className={styles.page}>
        <div className="container">
          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}
          <VerifySearch data={data} showToast={showToast} initialQ={initialQ} />
          <DataTable
            title="Accredited MTVs - Central Luzon Region"
            columns={columns}
            data={filteredData}
            loading={loading}
            emptyText="No accredited MTVs found."
            toolbarActions={({ filteredRows }) => (
              <>
                <button
                  type="button"
                  className={styles.advancedButton}
                  onClick={() => setAdvancedOpen(true)}>
                  Advanced Search
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  disabled={loading || filteredRows.length === 0}
                  onClick={() => exportAccreditedRows(filteredRows)}>
                  <ArrowDownTrayIcon aria-hidden="true" />
                  Export CSV
                </button>
              </>
            )}
          />
        </div>
      </div>

      {advancedOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAdvancedOpen(false);
          }}>
          <div
            className={styles.searchModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-search-title">
            <span className={styles.modalKicker}>Accredited MTVs</span>
            <h2 id="advanced-search-title">Advanced Search</h2>
            <div className={styles.filterGrid}>
              <label>
                <span>Registration No.</span>
                <input
                  type="text"
                  value={advancedFilters.reference}
                  onChange={(event) =>
                    updateAdvancedFilter("reference", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Plate No.</span>
                <input
                  type="text"
                  value={advancedFilters.plate}
                  onChange={(event) =>
                    updateAdvancedFilter("plate", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Establishment Name</span>
                <input
                  type="text"
                  value={advancedFilters.establishment}
                  onChange={(event) =>
                    updateAdvancedFilter("establishment", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Establishment Type</span>
                <select
                  value={advancedFilters.establishmentType}
                  onChange={(event) =>
                    updateAdvancedFilter("establishmentType", event.target.value)
                  }>
                  <option value="All">All establishment types</option>
                  {establishmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Owner</span>
                <input
                  type="text"
                  value={advancedFilters.owner}
                  onChange={(event) =>
                    updateAdvancedFilter("owner", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={advancedFilters.status}
                  onChange={(event) =>
                    updateAdvancedFilter("status", event.target.value)
                  }>
                  <option value="All">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Revoked">Revoked</option>
                </select>
              </label>
              <div className={styles.dateFilterField}>
                <div className={styles.fieldHeader}>
                  <span>Date Issued</span>
                  <label className={styles.inlineCheckbox}>
                    <input
                      type="checkbox"
                      checked={advancedFilters.issuedDateRange}
                      onChange={(event) =>
                        updateAdvancedFilter(
                          "issuedDateRange",
                          event.target.checked,
                        )
                      }
                    />
                    <span>Date range</span>
                  </label>
                </div>
                {advancedFilters.issuedDateRange ? (
                  <div className={styles.dateRangeInputs}>
                    <input
                      type="date"
                      aria-label="Date issued start date"
                      value={advancedFilters.issuedStartDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAdvancedFilter("issuedStartDate", event.target.value)
                      }
                    />
                    <input
                      type="date"
                      aria-label="Date issued end date"
                      value={advancedFilters.issuedEndDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAdvancedFilter("issuedEndDate", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="2026"
                    value={advancedFilters.issuedYear}
                    onChange={(event) =>
                      updateAdvancedFilter(
                        "issuedYear",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                )}
              </div>
              <div className={styles.dateFilterField}>
                <div className={styles.fieldHeader}>
                  <span>Expiry Date</span>
                  <label className={styles.inlineCheckbox}>
                    <input
                      type="checkbox"
                      checked={advancedFilters.expiryDateRange}
                      onChange={(event) =>
                        updateAdvancedFilter(
                          "expiryDateRange",
                          event.target.checked,
                        )
                      }
                    />
                    <span>Date range</span>
                  </label>
                </div>
                {advancedFilters.expiryDateRange ? (
                  <div className={styles.dateRangeInputs}>
                    <input
                      type="date"
                      aria-label="Expiry start date"
                      value={advancedFilters.expiryStartDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAdvancedFilter("expiryStartDate", event.target.value)
                      }
                    />
                    <input
                      type="date"
                      aria-label="Expiry end date"
                      value={advancedFilters.expiryEndDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAdvancedFilter("expiryEndDate", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="2026"
                    value={advancedFilters.expiryYear}
                    onChange={(event) =>
                      updateAdvancedFilter(
                        "expiryYear",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                )}
              </div>
              <div className={styles.checkboxField}>
                <input
                  id="expiringSoonOnly"
                  type="checkbox"
                  checked={advancedFilters.expiringSoonOnly}
                  onChange={(event) =>
                    updateAdvancedFilter("expiringSoonOnly", event.target.checked)
                  }
                />
                <label
                  className={styles.checkboxLabel}
                  htmlFor="expiringSoonOnly">
                  Expiring soon only
                </label>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearAdvancedFilters}>
                Clear filters
              </button>
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => setAdvancedOpen(false)}>
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast {...toastState} />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={<div className="spinner" style={{ margin: "80px auto" }} />}>
      <VerifyContent />
    </Suspense>
  );
}
