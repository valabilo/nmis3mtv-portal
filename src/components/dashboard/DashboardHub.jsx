"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  DocumentTextIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import DataTable from "@/components/ui/DataTable";
import StatusTag from "@/components/ui/StatusTag";
import GHPAppointments from "@/components/dashboard/GHPAppointments";
import { normalise } from "@/lib/utils";
import styles from "./DashboardHub.module.css";

const STATUSES = [
  "Under Review",
  "For Payment",
  "Rejected Application",
  "For Payment Verification",
  "Payment Verified",
  "Rejected Proof of Payment",
  "Completed",
  "Cancelled",
];

const APPLICATION_STATUSES = ["Application Received", ...STATUSES];
const REVIEW_STATUSES = [
  "Under Review",
  "For Payment",
  "For Payment Verification",
  "Payment Verified",
];
const APPROVED_STATUSES = ["Completed"];
const FLAGGED_STATUSES = [
  "Rejected Application",
  "Rejected Proof of Payment",
  "Cancelled",
];
const REMARKS_REQUIRED_STATUSES = [
  "Rejected Application",
  "Rejected Proof of Payment",
  "Cancelled",
];

const ACCREDITED_STATUSES = [
  "Active",
  "Expired",
  "Inactive",
  "Suspended",
  "Revoked",
  "Cancelled",
];

const BANNED_STATUSES = ["Banned", "Suspended", "Revoked"];

const TABS = [
  { id: "ghp", label: "GHP Seminars", icon: DocumentTextIcon },
  { id: "accredited", label: "Accredited", icon: ShieldCheckIcon },
  { id: "banned", label: "Banned", icon: XCircleIcon },
];

const EXPORT_MAX_BYTES = 3 * 1024 * 1024;

const APPLICATION_EXPORT_COLUMNS = [
  ["Reference", "reference"],
  ["Status", "status"],
  ["Remarks", "remarks"],
  ["Submitted", "timestamp"],
  ["Application Type", "applicationType"],
  ["Registered Owner", "registeredOwner"],
  ["Email", "email"],
  ["Contact", "contact"],
  ["Address", "address"],
  ["Region", "region"],
  ["Province", "province"],
  ["GHP Certificate", "ghpCertNumber"],
  ["Plate", "plate"],
  ["Vehicle Type", "vehicleType"],
  ["Make", "vehicleMake"],
  ["Model", "vehicleModel"],
  ["Year", "vehicleYear"],
  ["Capacity", "capacity"],
  ["Business Name", "businessName"],
  ["Business Type", "businessType"],
  ["Business Address", "businessAddress"],
  ["Reference Number", "receiptNo"],
  ["Drive Folder", "folderUrl"],
];

const ACCREDITED_EXPORT_COLUMNS = [
  ["Registration No.", "reference"],
  ["Plate No.", "plate"],
  ["Establishment Name", "business"],
  ["Establishment Type", "type"],
  ["Owner", "owner"],
  ["Date Issued", "approvedAt"],
  ["Expiry Date", "expiry"],
  ["Status", (row) => row.status || "Active"],
];

const BANNED_EXPORT_COLUMNS = [
  ["Plate No.", "plate"],
  ["Business Name", "business"],
  ["Owner", "owner"],
  ["Reason", "reason"],
  ["Date Banned", "date"],
  ["Status", "status"],
];

const AUDIT_TRAIL_EXPORT_COLUMNS = [
  ["Reference", "reference"],
  ["Trail No.", "trailNo"],
  ["Timestamp", "timestamp"],
  ["Date", "date"],
  ["Time", "time"],
  ["Status", "status"],
  ["Previous Status", "previousStatus"],
  ["Remarks", "remarks"],
  ["Application Type", "applicationType"],
  ["Owner", "registeredOwner"],
  ["Email", "email"],
  ["Plate", "plate"],
  ["Business Name", "businessName"],
  ["Establishment Type", "businessType"],
];

const ACCREDITED_TABLE_COLUMNS = [
  {
    key: "reference",
    label: "Registration No.",
    className: "noWrap",
  },
  {
    key: "plate",
    label: "Plate No.",
    className: "noWrap",
    render: (value) => <strong>{value}</strong>,
  },
  { key: "type", label: "Establishment Type" },
  { key: "business", label: "Establishment Name" },
  { key: "owner", label: "Owner" },
  {
    key: "approvedAt",
    label: "Date Issued",
    className: "noWrap",
    render: (value) => formatDate(value),
  },
  {
    key: "expiry",
    label: "Expiry Date",
    className: "noWrap",
    render: (value) => formatDate(value),
  },
  {
    key: "status",
    label: "Status",
    render: (value, row) => (
      <StatusWithExpiry status={value || "Active"} expiry={row.expiry} />
    ),
  },
];

const BANNED_TABLE_COLUMNS = [
  {
    key: "plate",
    label: "Plate No.",
    className: "noWrap",
    render: (value) => <strong>{value}</strong>,
  },
  { key: "business", label: "Business Name" },
  { key: "owner", label: "Owner" },
  { key: "reason", label: "Reason" },
  {
    key: "date",
    label: "Date Banned",
    className: "noWrap",
    render: (value) => formatDate(value),
  },
  {
    key: "status",
    label: "Status",
    render: (value) => <StatusTag status={value || "Banned"} />,
  },
];

const EMPTY_ACCREDITED_ADVANCED_FILTERS = {
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

const EMPTY_BANNED_FORM = {
  plate: "",
  business: "",
  owner: "",
  reason: "",
  date: "",
  status: "Banned",
};

const MONTHS = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
];

const DASHBOARD_POLL_INTERVAL_MS = 30000;
const MAX_DASHBOARD_NOTIFICATIONS = 20;
const MAX_VISIBLE_TOASTS = 4;
const NOTIFICATION_VISIBLE_MS = 15000;

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpiringSoon(value, status) {
  if (
    !value ||
    ["Cancelled", "Expired", "Inactive", "Revoked", "Suspended"].includes(
      status,
    )
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

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDocumentPreviewUrl(document) {
  if (!document?.id) return "";
  return `https://drive.google.com/file/d/${encodeURIComponent(document.id)}/preview`;
}

function documentReviewStatus(document) {
  return document?.reviewStatus || document?.review?.status || "";
}

function completedStatusBlockReason(application) {
  if (!application) return "";

  if (application.status !== "Payment Verified") {
    return "Status can only be changed to Completed after Payment Verified.";
  }

  const blockedDocuments = (application.documents || []).filter(
    (document) => documentReviewStatus(document) !== "Approved",
  );

  if (blockedDocuments.length) {
    return "Status cannot be changed to Completed while documents are pending or rejected.";
  }

  return "";
}

function visibleDocumentsForApplication(application) {
  const documents = application?.documents || [];
  const rejectedDocuments = documents.filter(
    (document) => documentReviewStatus(document) === "Rejected",
  );

  if (
    application?.status === "Rejected Application" &&
    rejectedDocuments.length
  ) {
    return rejectedDocuments;
  }

  return documents;
}

function yearFromValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return String(date.getFullYear());

  const match = String(value).match(/\b(20\d{2}|19\d{2})\b/);
  return match?.[1] || "";
}

function monthFromValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return String(date.getMonth() + 1).padStart(2, "0");
  }

  const text = String(value).toLowerCase();
  const monthIndex = MONTHS.findIndex(([, label]) =>
    text.includes(label.toLowerCase().slice(0, 3)),
  );

  return monthIndex >= 0 ? String(monthIndex + 1).padStart(2, "0") : "";
}

function recordYearMonth(value) {
  return {
    year: yearFromValue(value),
    month: monthFromValue(value),
  };
}

function monthLabel(value) {
  return MONTHS.find(([month]) => month === value)?.[1] || value;
}

function shortMonthLabel(value) {
  return monthLabel(value).slice(0, 3);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applicationSnapshot(application) {
  const latestHistory =
    application.statusHistory?.[application.statusHistory.length - 1] || {};

  return {
    timestamp: application.timestamp || "",
    applicationType: application.applicationType || "",
    statusHistoryLength: application.statusHistory?.length || 0,
    latestStatus: latestHistory.status || application.status || "",
    latestRemarks: latestHistory.remarks || application.remarks || "",
    latestTimestamp: latestHistory.timestamp || "",
  };
}

function buildApplicationSnapshotMap(records) {
  const map = new Map();
  records.forEach((application) => {
    if (application.reference) {
      map.set(application.reference, applicationSnapshot(application));
    }
  });
  return map;
}

function isAmendmentSnapshot(snapshot) {
  const applicationType = snapshot.applicationType.toLowerCase();
  return (
    applicationType === "amendment" ||
    snapshot.latestRemarks.toLowerCase().includes("amendment submitted")
  );
}

function registrationNumberForApplication(application, accreditedRecords = []) {
  const plate = String(application.plate || "")
    .trim()
    .toUpperCase();
  const reference = String(application.reference || "")
    .trim()
    .toUpperCase();
  const record = accreditedRecords.find((item) => {
    const itemPlate = String(item.plate || "")
      .trim()
      .toUpperCase();
    const itemReference = String(item.reference || "")
      .trim()
      .toUpperCase();

    return (
      (plate && itemPlate === plate) ||
      (reference && itemReference === reference)
    );
  });

  return (
    record?.reference ||
    application.registrationNo ||
    application.reference ||
    ""
  );
}

function buildApplicationNotification({
  application,
  accreditedRecords,
  before,
  after,
}) {
  const reference = application.reference;
  const registrationNo = registrationNumberForApplication(
    application,
    accreditedRecords,
  );
  const owner = application.registeredOwner || "Applicant";
  const base = {
    reference,
    tab: "details",
  };

  if (!before) {
    const isAmendment = isAmendmentSnapshot(after);
    return {
      ...base,
      title: isAmendment
        ? "Application amendment received"
        : "New application received",
      message: isAmendment
        ? `Registration No.: ${registrationNo}. Resubmitted with corrected details or documents.`
        : `Registration No.: ${registrationNo}. ${owner}`,
    };
  }

  if (before.latestStatus !== after.latestStatus) {
    return {
      ...base,
      title: "Application status updated",
      message: `${reference} changed from ${before.latestStatus || "No status"} to ${after.latestStatus || "No status"}.`,
    };
  }

  if (isAmendmentSnapshot(after)) {
    return {
      ...base,
      title: "Application amendment received",
      message: `Registration No.: ${registrationNo}. Resubmitted with corrected details or documents.`,
    };
  }

  if (before.latestTimestamp !== after.latestTimestamp) {
    return {
      ...base,
      title: "Application update received",
      message: `${reference} has a new update from ${owner}.`,
    };
  }

  return null;
}

function notificationTimestamp(notification) {
  if (!notification?.createdAt) return "";
  return `${formatDate(notification.createdAt)} ${formatTime(notification.createdAt)}`.trim();
}

function sortDropdownOptions(options) {
  return [...options].sort((a, b) =>
    String(a.label || "").localeCompare(String(b.label || ""), "en", {
      sensitivity: "base",
    }),
  );
}

function exportCsv({ filenameBase, columns, rows }) {
  const encoder = new TextEncoder();
  const header = `${columns.map(([label]) => csvCell(label)).join(",")}\n`;
  const chunks = [];
  let current = header;
  let currentSize = encoder.encode(current).length;

  rows.forEach((row) => {
    const line = `${columns
      .map(([, key]) =>
        csvCell(typeof key === "function" ? key(row) : row[key]),
      )
      .join(",")}\n`;
    const lineSize = encoder.encode(line).length;

    if (currentSize + lineSize > EXPORT_MAX_BYTES && current !== header) {
      chunks.push(current);
      current = header;
      currentSize = encoder.encode(current).length;
    }

    current += line;
    currentSize += lineSize;
  });

  chunks.push(current);
  const stamp = new Date().toISOString().slice(0, 10);

  chunks.forEach((chunk, index) => {
    const suffix = chunks.length > 1 ? `-part-${index + 1}` : "";
    downloadTextFile(`${filenameBase}-${stamp}${suffix}.csv`, chunk);
  });

  return chunks.length;
}

function auditTrailRowsForApplication(application) {
  const history = application.statusHistory?.length
    ? application.statusHistory
    : [
        {
          status: application.status || "Application Received",
          remarks: application.remarks || "Application submitted.",
          timestamp: application.timestamp || "",
        },
      ];

  return history.map((item, index) => ({
    reference: application.reference || "",
    trailNo: index + 1,
    timestamp: item.timestamp || "",
    date: formatDate(item.timestamp),
    time: formatTime(item.timestamp),
    status: item.status || "Application Received",
    previousStatus: item.previousStatus || "",
    remarks: item.remarks || "",
    applicationType: application.applicationType || "",
    registeredOwner: application.registeredOwner || "",
    email: application.email || "",
    plate: application.plate || "",
    businessName: application.businessName || "",
    businessType: application.businessType || "",
  }));
}

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function ApplicationTrail({ history = [], submittedAt }) {
  const items = history.length
    ? history
    : [
        {
          status: "Application Received",
          remarks: "Application submitted.",
          timestamp: submittedAt,
        },
      ];

  return (
    <div className={styles.trailList}>
      {items.map((item, index) => (
        <article
          key={`${item.status}-${item.timestamp || index}`}
          className={
            index === items.length - 1
              ? styles.trailItemActive
              : styles.trailItem
          }>
          <div className={styles.trailMarker}>
            <span>{index + 1}</span>
          </div>
          <div className={styles.trailContent}>
            <div>
              <strong>{item.status || "Application Received"}</strong>
              <time dateTime={item.timestamp || undefined}>
                <span>{formatDate(item.timestamp)}</span>
                <small>{formatTime(item.timestamp)}</small>
              </time>
            </div>
            <p>{item.remarks || "No remarks added."}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function MetricCard({ label, value, helper, tone = "default", onClick }) {
  return (
    <button
      type="button"
      className={`${styles.metricCard} ${styles[tone] || ""}`}
      onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </button>
  );
}

function BarChart({ data, valueKey = "count", labelKey = "label", helperKey }) {
  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className={styles.barChart}>
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0;
        return (
          <div className={styles.barRow} key={item[labelKey]}>
            <span>{item[labelKey]}</span>
            <div className={styles.barTrack}>
              <span
                style={{
                  width: `${Math.max((value / max) * 100, value ? 4 : 0)}%`,
                }}
              />
            </div>
            <strong>{value}</strong>
            {helperKey ? <small>{item[helperKey]}</small> : null}
          </div>
        );
      })}
    </div>
  );
}

function MonthlyTrendChart({ data }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className={styles.monthlyChart}>
      {data.map((item) => (
        <div className={styles.monthColumn} key={item.month}>
          <strong>{item.count}</strong>
          <div className={styles.monthTrack}>
            <span
              style={{
                height: `${Math.max((item.count / max) * 100, item.count ? 8 : 0)}%`,
              }}
            />
          </div>
          <small>{shortMonthLabel(item.month)}</small>
        </div>
      ))}
    </div>
  );
}

function Dropdown({ id, label, value, options, onChange, disabled = false }) {
  const menuId = `${id}-menu`;
  const rootRef = useRef(null);
  const optionRefs = useRef(new Map());
  const searchRef = useRef("");
  const searchTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState(value);
  const sortedOptions = useMemo(() => sortDropdownOptions(options), [options]);
  const selected =
    sortedOptions.find((option) => option.value === value) ||
    (value ? { value, label: value } : sortedOptions[0]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  function focusOption(option) {
    if (!option) return;
    setActiveValue(option.value);
    window.requestAnimationFrame(() => {
      const node = optionRefs.current.get(option.value);
      node?.scrollIntoView({ block: "nearest" });
      node?.focus();
    });
  }

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleTypeAhead(event) {
    if (
      event.key.length !== 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return false;
    }

    const typed = event.key.toLowerCase();
    searchRef.current += typed;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      searchRef.current = "";
    }, 700);

    const match =
      sortedOptions.find((option) =>
        String(option.label || "")
          .toLowerCase()
          .startsWith(searchRef.current),
      ) ||
      sortedOptions.find((option) =>
        String(option.label || "")
          .toLowerCase()
          .startsWith(typed),
      );

    if (match) {
      setOpen(true);
      focusOption(match);
    }

    return true;
  }

  function handleButtonKeyDown(event) {
    if (handleTypeAhead(event)) {
      event.preventDefault();
      return;
    }

    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      focusOption(selected);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function handleOptionKeyDown(event, option) {
    if (handleTypeAhead(event)) {
      event.preventDefault();
      return;
    }

    const currentIndex = sortedOptions.findIndex(
      (item) => item.value === option.value,
    );
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(
        sortedOptions[Math.min(currentIndex + 1, sortedOptions.length - 1)],
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(sortedOptions[Math.max(currentIndex - 1, 0)]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(option.value);
    } else if (event.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector("button")?.focus();
    }
  }

  return (
    <label className={styles.dropdownField} htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <div className={styles.dropdown} ref={rootRef}>
        <button
          id={id}
          type="button"
          className={styles.dropdownButton}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleButtonKeyDown}>
          <span>{selected?.label || "Select"}</span>
          <ChevronDownIcon aria-hidden="true" />
        </button>
        {open ? (
          <div
            id={menuId}
            className={styles.dropdownMenu}
            role="listbox"
            aria-label={label}>
            {sortedOptions.map((option) => (
              <button
                key={option.value}
                ref={(node) => {
                  if (node) optionRefs.current.set(option.value, node);
                  else optionRefs.current.delete(option.value);
                }}
                type="button"
                role="option"
                aria-selected={option.value === value}
                tabIndex={option.value === activeValue ? 0 : -1}
                className={
                  option.value === value
                    ? styles.dropdownOptionActive
                    : styles.dropdownOption
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, option)}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}

export default function DashboardHub() {
  const knownApplicationsRef = useRef(new Map());
  const knownApplicationsReadyRef = useRef(false);
  const notificationTimersRef = useRef(new Map());
  const [activeTab, setActiveTab] = useState("ghp");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [applications, setApplications] = useState([]);
  const [accreditedRecords, setAccreditedRecords] = useState([]);
  const [bannedRecords, setBannedRecords] = useState([]);
  const [stats, setStats] = useState({
    year: new Date().getFullYear(),
    accreditedTotal: 0,
    accreditedThisYear: 0,
    ghpIssuedThisYear: 0,
  });
  const [selectedRef, setSelectedRef] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [analyticsYear, setAnalyticsYear] = useState(
    String(new Date().getFullYear()),
  );
  const [accreditedAdvancedOpen, setAccreditedAdvancedOpen] = useState(false);
  const [accreditedAdvancedFilters, setAccreditedAdvancedFilters] = useState(
    EMPTY_ACCREDITED_ADVANCED_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingRemarks, setPendingRemarks] = useState("");
  const [pendingAccreditedRecord, setPendingAccreditedRecord] = useState(null);
  const [bannedModalOpen, setBannedModalOpen] = useState(false);
  const [bannedForm, setBannedForm] = useState(EMPTY_BANNED_FORM);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentReviewSaving, setDocumentReviewSaving] = useState("");
  const [recordLock, setRecordLock] = useState(null);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [visibleNotificationIds, setVisibleNotificationIds] = useState([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const SidebarToggleIcon = sidebarCollapsed
    ? ChevronDoubleRightIcon
    : ChevronDoubleLeftIcon;
  const isViewOnlyLocked = Boolean(recordLock && !recordLock.isMine);
  const unreadNotificationCount = dashboardNotifications.filter(
    (notification) => !notification.read,
  ).length;
  const visibleNotifications = dashboardNotifications.filter((notification) =>
    visibleNotificationIds.includes(notification.id),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/applications", {
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load applications.");
        }

        if (cancelled) return;
        const records = json.data || [];
        setApplications(records);
        knownApplicationsRef.current = buildApplicationSnapshotMap(records);
        knownApplicationsReadyRef.current = true;
        setAccreditedRecords(json.accredited || []);
        setBannedRecords(json.banned || []);
        setStats((current) => ({ ...current, ...(json.stats || {}) }));
        setSelectedRef((current) => current || records[0]?.reference || "");
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load applications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      notificationTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      notificationTimersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!error && !notice) return undefined;

    const timer = window.setTimeout(() => {
      setError("");
      setNotice("");
    }, NOTIFICATION_VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [error, notice]);

  async function refreshDashboardData() {
    const refreshed = await fetch("/api/admin/applications", {
      cache: "no-store",
    });
    const refreshedJson = await refreshed.json();

    if (!refreshed.ok || !refreshedJson.success) return;

    setApplications(refreshedJson.data || []);
    knownApplicationsRef.current = buildApplicationSnapshotMap(
      refreshedJson.data || [],
    );
    knownApplicationsReadyRef.current = true;
    setAccreditedRecords(refreshedJson.accredited || []);
    setBannedRecords(refreshedJson.banned || []);
    setStats((current) => ({ ...current, ...(refreshedJson.stats || {}) }));
  }

  function pushDashboardNotification(notification) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const nextNotification = {
      id,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setDashboardNotifications((items) =>
      [nextNotification, ...items].slice(0, MAX_DASHBOARD_NOTIFICATIONS),
    );
    setVisibleNotificationIds((ids) =>
      [id, ...ids].slice(0, MAX_VISIBLE_TOASTS),
    );

    const timer = window.setTimeout(() => {
      setVisibleNotificationIds((ids) => ids.filter((item) => item !== id));
      notificationTimersRef.current.delete(id);
    }, NOTIFICATION_VISIBLE_MS);

    notificationTimersRef.current.set(id, timer);
  }

  function hideDashboardToast(id) {
    const timer = notificationTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    notificationTimersRef.current.delete(id);
    setVisibleNotificationIds((ids) => ids.filter((item) => item !== id));
  }

  function openDashboardNotification(notification) {
    setDashboardNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    hideDashboardToast(notification.id);
    setNotificationPanelOpen(false);
    selectApplication(notification.reference, notification.tab || "details");
  }

  function markAllDashboardNotificationsRead() {
    setDashboardNotifications((items) =>
      items.map((item) => ({ ...item, read: true })),
    );
  }

  function detectApplicationNotifications(records, accredited = []) {
    const previous = knownApplicationsRef.current;
    const next = buildApplicationSnapshotMap(records);

    if (!knownApplicationsReadyRef.current) {
      knownApplicationsRef.current = next;
      knownApplicationsReadyRef.current = true;
      return;
    }

    records.forEach((application) => {
      const reference = application.reference;
      if (!reference) return;

      const before = previous.get(reference);
      const after = next.get(reference);
      if (!after) return;

      const changed =
        !before ||
        before.timestamp !== after.timestamp ||
        before.applicationType !== after.applicationType ||
        before.statusHistoryLength !== after.statusHistoryLength ||
        before.latestStatus !== after.latestStatus ||
        before.latestRemarks !== after.latestRemarks ||
        before.latestTimestamp !== after.latestTimestamp;

      if (changed) {
        const notification = buildApplicationNotification({
          application,
          accreditedRecords: accredited,
          before,
          after,
        });
        if (notification) pushDashboardNotification(notification);
      }
    });

    knownApplicationsRef.current = next;
  }

  useEffect(() => {
    let cancelled = false;

    async function pollDashboardData() {
      try {
        const response = await fetch("/api/admin/applications", {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok || !json.success || cancelled) return;

        const records = json.data || [];
        detectApplicationNotifications(records, json.accredited || []);
        setApplications(records);
        setAccreditedRecords(json.accredited || []);
        setStats((current) => ({ ...current, ...(json.stats || {}) }));
      } catch {
        // Keep dashboard polling quiet; visible errors are handled by manual loads/actions.
      }
    }

    const interval = window.setInterval(
      pollDashboardData,
      DASHBOARD_POLL_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const selectedApplication = useMemo(
    () =>
      applications.find(
        (application) => application.reference === selectedRef,
      ) ||
      applications[0] ||
      null,
    [applications, selectedRef],
  );

  const visibleDocuments = useMemo(
    () => visibleDocumentsForApplication(selectedApplication),
    [selectedApplication],
  );

  useEffect(() => {
    setDraftStatus(selectedApplication?.status || "");
  }, [selectedApplication]);

  useEffect(() => {
    const documents = visibleDocuments;
    if (!documents.length) {
      setSelectedDocumentId("");
      return;
    }

    const currentStillExists = documents.some(
      (document) => document.id === selectedDocumentId,
    );
    if (!currentStillExists) setSelectedDocumentId(documents[0].id);
  }, [visibleDocuments, selectedDocumentId]);

  const selectedDocument = useMemo(() => {
    return (
      visibleDocuments.find((document) => document.id === selectedDocumentId) ||
      visibleDocuments[0] ||
      null
    );
  }, [visibleDocuments, selectedDocumentId]);

  const accreditedTableColumns = useMemo(
    () => [
      ...ACCREDITED_TABLE_COLUMNS,
      {
        key: "actions",
        label: "Actions",
        className: "noWrap",
        render: (_, row) => {
          const isCancelled = String(row.status || "").trim() === "Cancelled";

          return (
            <button
              type="button"
              className={styles.cancelInlineButton}
              disabled={saving || isCancelled}
              onClick={() => setPendingAccreditedRecord(row)}>
              <XCircleIcon aria-hidden="true" />
              {isCancelled ? "Cancelled" : "Cancel"}
            </button>
          );
        },
      },
    ],
    [saving],
  );

  useEffect(() => {
    if (!selectedApplication?.reference || activeTab !== "details") {
      setRecordLock(null);
      return undefined;
    }

    const reference = selectedApplication.reference;
    let cancelled = false;

    async function syncLock() {
      try {
        const response = await fetch("/api/admin/locks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const json = await response.json();
        if (!cancelled && json.success) setRecordLock(json.lock || null);
      } catch {
        if (!cancelled) setRecordLock(null);
      }
    }

    syncLock();
    const interval = window.setInterval(syncLock, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      fetch(`/api/admin/locks?reference=${encodeURIComponent(reference)}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {});
    };
  }, [activeTab, selectedApplication?.reference]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const submittedDate = recordYearMonth(application.timestamp);
      const matchesStatus =
        statusFilter === "All" ||
        application.status === statusFilter ||
        (statusFilter === "ReviewGroup" &&
          REVIEW_STATUSES.includes(application.status)) ||
        (statusFilter === "ApprovedGroup" &&
          APPROVED_STATUSES.includes(application.status)) ||
        (statusFilter === "FlaggedGroup" &&
          FLAGGED_STATUSES.includes(application.status));
      const matchesYear =
        yearFilter === "All" || submittedDate.year === yearFilter;
      const matchesMonth =
        monthFilter === "All" || submittedDate.month === monthFilter;
      const searchText = [
        application.reference,
        application.registeredOwner,
        application.plate,
        application.businessName,
        application.email,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesYear &&
        matchesMonth &&
        (!normalizedQuery || searchText.includes(normalizedQuery))
      );
    });
  }, [applications, query, statusFilter, yearFilter, monthFilter]);

  const applicationYears = useMemo(() => {
    const years = applications
      .map((application) => yearFromValue(application.timestamp))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [applications]);

  const analyticsYears = useMemo(() => {
    const years = [
      ...applications.map((application) =>
        yearFromValue(application.timestamp),
      ),
      ...accreditedRecords.map((record) =>
        yearFromValue(record.approvedAt || record.dateIssued),
      ),
    ].filter(Boolean);

    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [accreditedRecords, applications]);

  useEffect(() => {
    if (
      analyticsYear === "All" ||
      !analyticsYears.length ||
      analyticsYears.includes(analyticsYear)
    ) {
      return;
    }
    setAnalyticsYear(analyticsYears[0]);
  }, [analyticsYear, analyticsYears]);

  const analytics = useMemo(() => {
    const selectedYear = analyticsYear === "All" ? "" : analyticsYear;
    const yearApplications = selectedYear
      ? applications.filter(
          (application) =>
            yearFromValue(application.timestamp) === selectedYear,
        )
      : applications;
    const yearAccredited = selectedYear
      ? accreditedRecords.filter(
          (record) =>
            yearFromValue(record.approvedAt || record.dateIssued) ===
            selectedYear,
        )
      : accreditedRecords;
    const monthlyAccredited = MONTHS.map(([month, label]) => ({
      month,
      label,
      count: yearAccredited.filter(
        (record) =>
          monthFromValue(record.approvedAt || record.dateIssued) === month,
      ).length,
    }));
    const yearlyMap = new Map();

    accreditedRecords.forEach((record) => {
      const year =
        yearFromValue(record.approvedAt || record.dateIssued) || "No date";
      yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
    });

    const yearlyAccredited = Array.from(yearlyMap, ([label, count]) => ({
      label,
      count,
    })).sort((a, b) => Number(a.label) - Number(b.label));

    const typeMap = new Map();
    yearAccredited.forEach((record) => {
      const type =
        record.type ||
        record.establishment_type ||
        record.business_type ||
        "Unspecified";
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const establishmentTypes = Array.from(typeMap, ([label, count]) => ({
      label,
      count,
      share: `${percentage(count, yearAccredited.length)}%`,
    })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const statusBreakdown = ["Application Received", ...STATUSES].map(
      (status) => ({
        label: status,
        count: yearApplications.filter(
          (application) => application.status === status,
        ).length,
        share: `${percentage(
          yearApplications.filter(
            (application) => application.status === status,
          ).length,
          yearApplications.length,
        )}%`,
      }),
    );

    return {
      monthlyAccredited,
      yearlyAccredited,
      establishmentTypes,
      statusBreakdown,
      selectedApplications: yearApplications.length,
      selectedAccredited: yearAccredited.length,
    };
  }, [accreditedRecords, analyticsYear, applications]);

  const filteredAccreditedRecords = useMemo(() => {
    return accreditedRecords.filter((record) => {
      const status = record.status || "Active";
      const checks = [
        [
          accreditedAdvancedFilters.reference,
          record.reference || record.registration_no,
        ],
        [
          accreditedAdvancedFilters.plate,
          record.plate || record.plate_no || record.plate_number,
        ],
        [
          accreditedAdvancedFilters.establishment,
          record.business || record.business_name,
        ],
        [accreditedAdvancedFilters.owner, record.owner],
      ];
      const textMatches = checks.every(([filterValue, recordValue]) => {
        const filterText = normalise(filterValue);
        return !filterText || normalise(recordValue || "").includes(filterText);
      });
      const matchesStatus =
        accreditedAdvancedFilters.status === "All" ||
        status === accreditedAdvancedFilters.status;
      const matchesEstablishmentType =
        accreditedAdvancedFilters.establishmentType === "All" ||
        normalise(record.type) ===
          normalise(accreditedAdvancedFilters.establishmentType);
      const matchesIssuedYear =
        accreditedAdvancedFilters.issuedDateRange ||
        !accreditedAdvancedFilters.issuedYear ||
        yearFromValue(
          record.approvedAt || record.dateIssued || record.date_issued,
        ) === accreditedAdvancedFilters.issuedYear.trim();
      const matchesIssuedDateRange =
        !accreditedAdvancedFilters.issuedDateRange ||
        dateInRange(
          record.approvedAt || record.dateIssued || record.date_issued,
          accreditedAdvancedFilters.issuedStartDate,
          accreditedAdvancedFilters.issuedEndDate,
        );
      const matchesExpiryYear =
        accreditedAdvancedFilters.expiryDateRange ||
        !accreditedAdvancedFilters.expiryYear ||
        yearFromValue(record.expiry || record.expiry_date) ===
          accreditedAdvancedFilters.expiryYear.trim();
      const matchesExpiryDateRange =
        !accreditedAdvancedFilters.expiryDateRange ||
        dateInRange(
          record.expiry || record.expiry_date,
          accreditedAdvancedFilters.expiryStartDate,
          accreditedAdvancedFilters.expiryEndDate,
        );
      const matchesExpiryWindow =
        !accreditedAdvancedFilters.expiringSoonOnly ||
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
  }, [accreditedRecords, accreditedAdvancedFilters]);

  const establishmentTypes = useMemo(() => {
    return [
      ...new Set(
        accreditedRecords.map((record) => record.type).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [accreditedRecords]);

  const metrics = useMemo(() => {
    const pending = applications.filter(
      (item) => item.status === "Application Received",
    ).length;
    const activeReview = applications.filter((item) =>
      REVIEW_STATUSES.includes(item.status),
    ).length;
    const approved = applications.filter((item) =>
      APPROVED_STATUSES.includes(item.status),
    ).length;
    const flagged = applications.filter((item) =>
      FLAGGED_STATUSES.includes(item.status),
    ).length;

    return { pending, activeReview, approved, flagged };
  }, [applications]);

  const statusOptions = [
    { value: "All", label: "All statuses" },
    { value: "ReviewGroup", label: "In review" },
    { value: "ApprovedGroup", label: "Completed" },
    { value: "FlaggedGroup", label: "Flagged / cancelled" },
    { value: "Application Received", label: "Application Received" },
    ...STATUSES.map((status) => ({ value: status, label: status })),
  ].filter(
    (option, index, options) =>
      options.findIndex((item) => item.label === option.label) === index,
  );
  const yearOptions = [
    { value: "All", label: "All years" },
    ...applicationYears.map((year) => ({ value: year, label: year })),
  ];
  const analyticsYearOptions = [
    { value: "All", label: "All years" },
    ...analyticsYears.map((year) => ({ value: year, label: year })),
  ];
  const monthOptions = [
    { value: "All", label: "All months" },
    ...MONTHS.map(([value, label]) => ({ value, label })),
  ];
  function updateAccreditedAdvancedFilter(key, value) {
    setAccreditedAdvancedFilters((current) => ({ ...current, [key]: value }));
  }

  function clearAccreditedAdvancedFilters() {
    setAccreditedAdvancedFilters(EMPTY_ACCREDITED_ADVANCED_FILTERS);
  }

  function handleStatusChangeRequest(nextStatus) {
    if (isViewOnlyLocked) {
      setError(
        `${recordLock.owner} is currently editing this record. View-only mode is enabled.`,
      );
      return;
    }
    if (!selectedApplication || nextStatus === selectedApplication.status)
      return;
    if (nextStatus === "Completed") {
      const blockReason = completedStatusBlockReason(selectedApplication);
      if (blockReason) {
        setError(blockReason);
        return;
      }
    }
    setPendingStatus(nextStatus);
    setPendingRemarks("");
  }

  async function submitStatusUpdate(nextStatus) {
    if (isViewOnlyLocked) {
      setError(
        `${recordLock.owner} is currently editing this record. View-only mode is enabled.`,
      );
      return;
    }
    if (!selectedApplication || !nextStatus) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: selectedApplication.reference,
          status: nextStatus,
          remarks: pendingRemarks,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update status.");
      }

      setApplications((records) =>
        records.map((record) =>
          record.reference === selectedApplication.reference
            ? { ...record, status: nextStatus, remarks: pendingRemarks }
            : record,
        ),
      );
      await refreshDashboardData();

      const previousStatus =
        json.application?.previousStatus ||
        selectedApplication.status ||
        "Application Received";
      setNotice(
        `Successfully changed the status from ${previousStatus} to ${nextStatus}.`,
      );
      setDraftStatus(nextStatus);
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setSaving(false);
      setPendingStatus("");
      setPendingRemarks("");
    }
  }

  async function updateDocumentReview(document, reviewStatus) {
    if (isViewOnlyLocked) {
      setError(
        `${recordLock.owner} is currently editing this record. View-only mode is enabled.`,
      );
      return;
    }
    if (!selectedApplication || !document?.id) return;

    setDocumentReviewSaving(`${document.id}:${reviewStatus}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "document",
          reference: selectedApplication.reference,
          documentId: document.id,
          documentName: document.name,
          status: reviewStatus,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update document review.");
      }

      const nextReview = {
        id: document.id,
        name: document.name,
        status: reviewStatus,
        reviewedAt: new Date().toISOString(),
      };

      setApplications((records) =>
        records.map((record) =>
          record.reference === selectedApplication.reference
            ? {
                ...record,
                documentReview: {
                  ...(record.documentReview || {}),
                  [document.id]: nextReview,
                },
                documents: (record.documents || []).map((item) =>
                  item.id === document.id
                    ? { ...item, review: nextReview, reviewStatus }
                    : item,
                ),
              }
            : record,
        ),
      );
      setNotice(`${document.name} marked as ${reviewStatus.toLowerCase()}.`);
    } catch (err) {
      setError(err.message || "Failed to update document review.");
    } finally {
      setDocumentReviewSaving("");
    }
  }

  async function confirmStatusChange() {
    if (isViewOnlyLocked) {
      setError(
        `${recordLock.owner} is currently editing this record. View-only mode is enabled.`,
      );
      setPendingStatus("");
      setPendingRemarks("");
      return;
    }
    if (!selectedApplication || !pendingStatus) return;

    if (
      REMARKS_REQUIRED_STATUSES.includes(pendingStatus) &&
      !pendingRemarks.trim()
    ) {
      setError("Remarks are required when rejecting or cancelling a record.");
      return;
    }

    if (pendingStatus === "Completed") {
      const blockReason = completedStatusBlockReason(selectedApplication);
      if (blockReason) {
        setError(blockReason);
        setPendingStatus("");
        setPendingRemarks("");
        return;
      }
    }

    await submitStatusUpdate(pendingStatus);
  }

  async function confirmAccreditedCancellation() {
    if (!pendingAccreditedRecord) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "accredited",
          reference:
            pendingAccreditedRecord.reference ||
            pendingAccreditedRecord.registration_no ||
            pendingAccreditedRecord.plate,
          status: "Cancelled",
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to cancel accredited MTV.");
      }

      setAccreditedRecords((records) =>
        records.map((record) =>
          record.reference === pendingAccreditedRecord.reference
            ? { ...record, status: "Cancelled" }
            : record,
        ),
      );
      await refreshDashboardData();
      setNotice(
        `Accredited MTV ${pendingAccreditedRecord.reference || pendingAccreditedRecord.plate} cancelled.`,
      );
    } catch (err) {
      setError(err.message || "Failed to cancel accredited MTV.");
    } finally {
      setSaving(false);
      setPendingAccreditedRecord(null);
    }
  }

  async function submitBannedRecord(event) {
    event.preventDefault();

    const plate = bannedForm.plate.trim();
    const reason = bannedForm.reason.trim();

    if (!plate) {
      setError("Plate number is required.");
      return;
    }

    if (!reason) {
      setError("Reason is required.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-banned",
          ...bannedForm,
          plate,
          reason,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to add banned MTV.");
      }

      setBannedRecords((records) => [json.banned, ...records]);
      await refreshDashboardData();
      setNotice(`Banned MTV ${json.banned?.plate || plate} added.`);
      setBannedModalOpen(false);
      setBannedForm(EMPTY_BANNED_FORM);
    } catch (err) {
      setError(err.message || "Failed to add banned MTV.");
    } finally {
      setSaving(false);
    }
  }

  function cancelStatusChange() {
    if (saving) return;
    setDraftStatus(selectedApplication?.status || "");
    setPendingStatus("");
    setPendingRemarks("");
    setPendingAccreditedRecord(null);
  }

  function selectApplication(reference, tab = "details") {
    setSelectedRef(reference);
    setActiveTab(tab);
    setNotice("");
  }

  function openApplicationFilter(nextStatusFilter) {
    setStatusFilter(nextStatusFilter);
    setYearFilter("All");
    setMonthFilter("All");
    setQuery("");
    setActiveTab("applications");
    setNotice("");
  }

  function exportApplications() {
    const parts = exportCsv({
      filenameBase: "mtv-applications",
      columns: APPLICATION_EXPORT_COLUMNS,
      rows: filteredApplications,
    });
    setNotice(
      `Exported ${filteredApplications.length} filtered application records${parts > 1 ? ` into ${parts} files` : ""}.`,
    );
  }

  function exportAccredited(rows = filteredAccreditedRecords) {
    const parts = exportCsv({
      filenameBase: "mtv-accredited",
      columns: ACCREDITED_EXPORT_COLUMNS,
      rows,
    });
    setNotice(
      `Exported ${rows.length} filtered accredited records${parts > 1 ? ` into ${parts} files` : ""}.`,
    );
  }

  function exportBanned(rows = bannedRecords) {
    const parts = exportCsv({
      filenameBase: "mtv-banned",
      columns: BANNED_EXPORT_COLUMNS,
      rows,
    });
    setNotice(
      `Exported ${rows.length} filtered banned records${parts > 1 ? ` into ${parts} files` : ""}.`,
    );
  }

  function exportAuditTrail(application = selectedApplication) {
    if (!application) return;
    const rows = auditTrailRowsForApplication(application);
    const parts = exportCsv({
      filenameBase: `mtv-audit-trail-${application.reference}`,
      columns: AUDIT_TRAIL_EXPORT_COLUMNS,
      rows,
    });
    setNotice(
      `Downloaded ${rows.length} audit trail entries for ${application.reference}${parts > 1 ? ` into ${parts} files` : ""}.`,
    );
  }

  function exportAllAuditTrails() {
    const rows = filteredApplications.flatMap(auditTrailRowsForApplication);
    const parts = exportCsv({
      filenameBase: "mtv-audit-trails",
      columns: AUDIT_TRAIL_EXPORT_COLUMNS,
      rows,
    });
    setNotice(
      `Downloaded ${rows.length} audit trail entries from ${filteredApplications.length} filtered applications${parts > 1 ? ` into ${parts} files` : ""}.`,
    );
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/dashboard/login");
  }

  return (
    <div
      className={`${styles.dashboardShell} ${
        sidebarCollapsed ? styles.sidebarCollapsed : ""
      }`}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span>MTV</span>
          <div>
            <strong>Admin</strong>
            <small>RTOC III</small>
          </div>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}>
            <SidebarToggleIcon aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.tabs} aria-label="Dashboard tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab(tab.id)}>
                <Icon aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <Link href="/" className={styles.publicLink}>
          <HomeIcon aria-hidden="true" />
          <span>Public portal</span>
        </Link>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.kicker}>Private Link</span>
            <h1>MTV Applications Dashboard</h1>
          </div>
          <div className={styles.topbarMeta}>
            <span>{applications.length} applications</span>
            <div className={styles.notificationBellWrap}>
              <button
                type="button"
                className={styles.notificationBell}
                onClick={() => setNotificationPanelOpen((open) => !open)}
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`}
                aria-expanded={notificationPanelOpen}>
                <BellIcon aria-hidden="true" />
                {unreadNotificationCount ? (
                  <span className={styles.notificationBadge}>
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                ) : null}
              </button>

              {notificationPanelOpen ? (
                <div className={styles.notificationPanel}>
                  <div className={styles.notificationPanelHeader}>
                    <strong>Notifications</strong>
                    {dashboardNotifications.length ? (
                      <button
                        type="button"
                        onClick={markAllDashboardNotificationsRead}>
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  {dashboardNotifications.length ? (
                    <div className={styles.notificationList}>
                      {dashboardNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className={
                            notification.read
                              ? styles.notificationItem
                              : styles.notificationItemUnread
                          }
                          onClick={() =>
                            openDashboardNotification(notification)
                          }>
                          <span>
                            <strong>{notification.title}</strong>
                            <small>{notificationTimestamp(notification)}</small>
                          </span>
                          <em>{notification.message}</em>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.notificationEmpty}>
                      No new notifications.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        {notice ? <div className={styles.noticeBanner}>{notice}</div> : null}
        {recordLock && !recordLock.isMine ? (
          <div className={styles.warningBanner}>
            {recordLock.owner} is currently editing {recordLock.reference}.
            Please coordinate before updating this record.
          </div>
        ) : null}

        {activeTab === "overview" && (
          <section className={styles.section}>
            <div className={styles.metricsGrid}>
              <MetricCard
                label="Application Received"
                value={loading ? "..." : metrics.pending}
                helper="New submissions waiting for intake review."
                tone="pendingTone"
                onClick={() => openApplicationFilter("Application Received")}
              />
              <MetricCard
                label="In Review"
                value={loading ? "..." : metrics.activeReview}
                helper="Applications currently being evaluated."
                tone="reviewTone"
                onClick={() => openApplicationFilter("ReviewGroup")}
              />
              <MetricCard
                label="Completed"
                value={loading ? "..." : metrics.approved}
                helper="Applications completed after final checking."
                tone="approvedTone"
                onClick={() => openApplicationFilter("ApprovedGroup")}
              />
              <MetricCard
                label="Rejected"
                value={loading ? "..." : metrics.flagged}
                helper="Applications requiring closure or applicant correction."
                tone="flaggedTone"
                onClick={() => openApplicationFilter("FlaggedGroup")}
              />
            </div>

            <div className={styles.statsGrid}>
              <article className={styles.statPanel}>
                <span className={styles.kicker}>Accredited MTVs</span>
                <strong>{loading ? "..." : stats.accreditedTotal}</strong>
                <p>Total active records in the Accredited sheet.</p>
              </article>
              <article className={styles.statPanel}>
                <span className={styles.kicker}>
                  Accredited in {stats.year}
                </span>
                <strong>{loading ? "..." : stats.accreditedThisYear}</strong>
                <p>Records approved or added during the current year.</p>
              </article>
              <article className={styles.statPanel}>
                <span className={styles.kicker}>
                  GHP Certificates in {stats.year}
                </span>
                <strong>{loading ? "..." : stats.ghpIssuedThisYear}</strong>
                <p>
                  Certificates issued from the GHP completions sheet this year.
                </p>
              </article>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Queue</span>
                  <h2>Recent Applications</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("applications")}>
                  View all
                </button>
              </div>
              <div className={styles.compactList}>
                {applications.slice(0, 6).map((application) => (
                  <button
                    key={application.reference}
                    type="button"
                    onClick={() => selectApplication(application.reference)}>
                    <span>
                      <strong>{application.reference}</strong>
                      {application.registeredOwner}
                    </span>
                    <StatusTag status={application.status} />
                  </button>
                ))}
                {!loading && applications.length === 0 ? (
                  <p className={styles.emptyState}>No applications found.</p>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {activeTab === "analytics" && (
          <section className={styles.section}>
            <div className={styles.analyticsHeader}>
              <div>
                <span className={styles.kicker}>Analytics</span>
                <h2>MTV Application Trends</h2>
                <p>
                  {analytics.selectedApplications} applications and{" "}
                  {analytics.selectedAccredited} accredited MTV records in view.
                </p>
              </div>
              <Dropdown
                id="analytics-year-filter"
                label="Year"
                value={analyticsYear}
                options={analyticsYearOptions}
                onChange={setAnalyticsYear}
              />
            </div>

            <div className={styles.analyticsGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Monthly</span>
                    <h2>Accredited by Month</h2>
                  </div>
                </div>
                <MonthlyTrendChart data={analytics.monthlyAccredited} />
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Establishment Type</span>
                    <h2>Accredited MTVs</h2>
                  </div>
                </div>
                <BarChart
                  data={analytics.establishmentTypes.slice(0, 10)}
                  helperKey="share"
                />
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Yearly</span>
                    <h2>Accredited Volume</h2>
                  </div>
                </div>
                <BarChart data={analytics.yearlyAccredited} />
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Status</span>
                    <h2>Application Pipeline</h2>
                  </div>
                </div>
                <BarChart data={analytics.statusBreakdown} helperKey="share" />
              </article>
            </div>
          </section>
        )}

        {activeTab === "applications" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <MagnifyingGlassIcon aria-hidden="true" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search reference, owner, plate, email..."
                  />
                </div>
                <Dropdown
                  id="application-status-filter"
                  value={statusFilter}
                  options={statusOptions}
                  onChange={setStatusFilter}
                />
                <Dropdown
                  id="application-year-filter"
                  value={yearFilter}
                  options={yearOptions}
                  onChange={setYearFilter}
                />
                <Dropdown
                  id="application-month-filter"
                  value={monthFilter}
                  options={monthOptions}
                  onChange={setMonthFilter}
                />
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={exportApplications}
                  disabled={filteredApplications.length === 0}>
                  <ArrowDownTrayIcon aria-hidden="true" />
                  Export
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={exportAllAuditTrails}
                  disabled={filteredApplications.length === 0}>
                  <ArrowDownTrayIcon aria-hidden="true" />
                  Audit trail
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Owner</th>
                      <th>Plate</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr
                        key={application.reference}
                        className={
                          selectedApplication?.reference ===
                          application.reference
                            ? styles.selectedRow
                            : ""
                        }
                        onClick={() =>
                          selectApplication(application.reference)
                        }>
                        <td>
                          <strong>{application.reference}</strong>
                        </td>
                        <td>{application.registeredOwner}</td>
                        <td>{application.plate || "No plate"}</td>
                        <td>{formatDate(application.timestamp)}</td>
                        <td>
                          <StatusTag status={application.status} />
                        </td>
                        <td>{application.documents?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && filteredApplications.length === 0 ? (
                  <p className={styles.emptyState}>No matching applications.</p>
                ) : null}
                {loading ? <div className="spinner" /> : null}
              </div>
            </div>
          </section>
        )}

        {activeTab === "ghp" && <GHPAppointments />}

        {activeTab === "accredited" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Accredited</span>
                  <h2>Accredited MTV Records</h2>
                </div>
                <Link href="/verify" className={styles.openFolder}>
                  Public verification
                  <ArrowTopRightOnSquareIcon aria-hidden="true" />
                </Link>
              </div>

              <DataTable
                title="Accredited MTVs - Central Luzon Region"
                columns={accreditedTableColumns}
                data={filteredAccreditedRecords}
                loading={loading}
                emptyText="No accredited records found."
                toolbarActions={({ filteredRows }) => (
                  <>
                    <button
                      type="button"
                      className={styles.advancedButton}
                      onClick={() => setAccreditedAdvancedOpen(true)}>
                      Advanced Search
                    </button>
                    <button
                      type="button"
                      className={styles.exportButton}
                      onClick={() => exportAccredited(filteredRows)}
                      disabled={loading || filteredRows.length === 0}>
                      <ArrowDownTrayIcon aria-hidden="true" />
                      Export CSV
                    </button>
                  </>
                )}
              />
            </div>
          </section>
        )}

        {activeTab === "banned" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Compliance</span>
                  <h2>Banned / Suspended MTV Records</h2>
                </div>
                <Link href="/banned" className={styles.openFolder}>
                  Public banned list
                  <ArrowTopRightOnSquareIcon aria-hidden="true" />
                </Link>
              </div>

              <DataTable
                title="Banned MTVs - Central Luzon Region"
                columns={BANNED_TABLE_COLUMNS}
                data={bannedRecords}
                loading={loading}
                emptyText="No banned records found."
                toolbarActions={({ filteredRows }) => (
                  <>
                    <button
                      type="button"
                      className={styles.advancedButton}
                      onClick={() => {
                        setBannedForm(EMPTY_BANNED_FORM);
                        setBannedModalOpen(true);
                      }}>
                      <PlusIcon aria-hidden="true" />
                      Add banned MTV
                    </button>
                    <button
                      type="button"
                      className={styles.exportButton}
                      onClick={() => exportBanned(filteredRows)}
                      disabled={loading || filteredRows.length === 0}>
                      <ArrowDownTrayIcon aria-hidden="true" />
                      Export CSV
                    </button>
                  </>
                )}
              />
            </div>
          </section>
        )}

        {activeTab === "details" && (
          <section className={styles.section}>
            {selectedApplication ? (
              <div className={styles.reviewGrid}>
                <div className={styles.detailsColumn}>
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Application</span>
                        <h2>{selectedApplication.reference}</h2>
                      </div>
                      <StatusTag status={selectedApplication.status} />
                    </div>

                    <div className={styles.statusEditor}>
                      <label htmlFor="status">Update status</label>
                      <div>
                        <Dropdown
                          id="status"
                          value={draftStatus || selectedApplication.status}
                          disabled={saving || isViewOnlyLocked}
                          options={APPLICATION_STATUSES.map((status) => ({
                            value: status,
                            label: status,
                          }))}
                          onChange={setDraftStatus}
                        />
                        <button
                          type="button"
                          disabled={
                            saving ||
                            isViewOnlyLocked ||
                            !draftStatus ||
                            draftStatus === selectedApplication.status
                          }
                          onClick={() =>
                            handleStatusChangeRequest(draftStatus)
                          }>
                          Update status
                        </button>
                      </div>
                      {isViewOnlyLocked ? (
                        <p className={styles.readOnlyNote}>
                          View-only mode while {recordLock.owner} edits this
                          record.
                        </p>
                      ) : null}
                    </div>

                    <div className={styles.infoGrid}>
                      <InfoRow
                        label="Owner"
                        value={selectedApplication.registeredOwner}
                      />
                      <InfoRow
                        label="Email"
                        value={selectedApplication.email}
                      />
                      <InfoRow
                        label="Contact"
                        value={selectedApplication.contact}
                      />
                      <InfoRow
                        label="Address"
                        value={selectedApplication.address}
                      />
                      <InfoRow
                        label="Province"
                        value={selectedApplication.province}
                      />
                      <InfoRow
                        label="GHP Certificate"
                        value={selectedApplication.ghpCertNumber}
                      />
                      <InfoRow
                        label="Application Type"
                        value={selectedApplication.applicationType}
                      />
                      <InfoRow
                        label="Submitted"
                        value={formatDate(selectedApplication.timestamp)}
                      />
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Vehicle</span>
                        <h2>Registration Details</h2>
                      </div>
                      <TruckIcon aria-hidden="true" />
                    </div>
                    <div className={styles.infoGrid}>
                      <InfoRow
                        label="Plate Number"
                        value={selectedApplication.plate}
                      />
                      <InfoRow
                        label="Vehicle Type"
                        value={selectedApplication.vehicleType}
                      />
                      <InfoRow
                        label="Make"
                        value={selectedApplication.vehicleMake}
                      />
                      <InfoRow
                        label="Model"
                        value={selectedApplication.vehicleModel}
                      />
                      <InfoRow
                        label="Year"
                        value={selectedApplication.vehicleYear}
                      />
                      <InfoRow
                        label="Capacity"
                        value={selectedApplication.capacity}
                      />
                      <InfoRow
                        label="Color"
                        value={selectedApplication.vehicleColor}
                      />
                      <InfoRow
                        label="Engine Number"
                        value={selectedApplication.engineNumber}
                      />
                      <InfoRow
                        label="Chassis Number"
                        value={selectedApplication.chassisNumber}
                      />
                      <InfoRow
                        label="CR Number"
                        value={selectedApplication.crNumber}
                      />
                      <InfoRow
                        label="OR Number"
                        value={selectedApplication.orNumber}
                      />
                      <InfoRow
                        label="Reference Number"
                        value={selectedApplication.receiptNo}
                      />
                      <InfoRow
                        label="Cooling System"
                        value={selectedApplication.coolingSystem}
                      />
                      <InfoRow
                        label="Material"
                        value={selectedApplication.material}
                      />
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Business</span>
                        <h2>Operation Details</h2>
                      </div>
                    </div>
                    <div className={styles.infoGrid}>
                      <InfoRow
                        label="Business Name"
                        value={selectedApplication.businessName}
                      />
                      <InfoRow
                        label="Business Type"
                        value={selectedApplication.businessType}
                      />
                      <InfoRow
                        label="Business Address"
                        value={selectedApplication.businessAddress}
                      />
                      <InfoRow
                        label="Meat Establishment"
                        value={selectedApplication.meatEstablishment}
                      />
                      <InfoRow
                        label="Intended Route"
                        value={selectedApplication.intendedRoute}
                      />
                      <InfoRow
                        label="Latest Remarks"
                        value={selectedApplication.remarks}
                      />
                    </div>
                  </div>

                  <div className={`${styles.panel} ${styles.trailPanel}`}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Paper Trail</span>
                        <h2>Application Progress</h2>
                      </div>
                      <button type="button" onClick={() => exportAuditTrail()}>
                        <ArrowDownTrayIcon aria-hidden="true" />
                        Download
                      </button>
                    </div>
                    <ApplicationTrail
                      history={selectedApplication.statusHistory}
                      submittedAt={selectedApplication.timestamp}
                    />
                  </div>
                </div>

                <div className={`${styles.panel} ${styles.reviewPanel}`}>
                  <div className={styles.panelHeader}>
                    <div>
                      <span className={styles.kicker}>Document Review</span>
                      <h2>
                        {selectedDocument?.name || "No document selected"}
                      </h2>
                    </div>
                    {selectedDocument?.webViewLink ? (
                      <a
                        href={selectedDocument.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.openFolder}>
                        Open Drive
                        <ArrowTopRightOnSquareIcon aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>

                  {visibleDocuments.length ? (
                    <div className={styles.documentReviewBody}>
                      <div className={styles.reviewDocumentSelect}>
                        <Dropdown
                          id="document-review"
                          label="Document"
                          value={selectedDocument?.id || ""}
                          options={visibleDocuments.map((document) => ({
                            value: document.id,
                            label: documentReviewStatus(document)
                              ? `${document.name} (${documentReviewStatus(document)})`
                              : document.name,
                          }))}
                          onChange={setSelectedDocumentId}
                        />
                      </div>

                      {selectedDocument ? (
                        <>
                          <div className={styles.documentReviewActions}>
                            <span
                              className={
                                documentReviewStatus(selectedDocument) ===
                                "Approved"
                                  ? styles.documentApproved
                                  : documentReviewStatus(selectedDocument) ===
                                      "Rejected"
                                    ? styles.documentRejected
                                    : styles.documentPending
                              }>
                              {documentReviewStatus(selectedDocument) ||
                                "Pending review"}
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentReview(
                                    selectedDocument,
                                    "Approved",
                                  )
                                }
                                disabled={
                                  Boolean(documentReviewSaving) ||
                                  isViewOnlyLocked
                                }>
                                <ShieldCheckIcon aria-hidden="true" />
                                Approved
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentReview(
                                    selectedDocument,
                                    "Rejected",
                                  )
                                }
                                disabled={
                                  Boolean(documentReviewSaving) ||
                                  isViewOnlyLocked
                                }>
                                <XCircleIcon aria-hidden="true" />
                                Rejected
                              </button>
                            </div>
                          </div>
                          <iframe
                            className={styles.documentPreview}
                            src={getDocumentPreviewUrl(selectedDocument)}
                            title={`Preview of ${selectedDocument.name}`}
                            loading="lazy"
                          />
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>
                      No document files were returned for this application.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.emptyState}>
                Select an application to view details.
              </p>
            )}
          </section>
        )}

        {activeTab === "documents" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Documents</span>
                  <h2>
                    {selectedApplication?.reference ||
                      "No application selected"}
                  </h2>
                </div>
                {selectedApplication?.folderUrl ? (
                  <a
                    href={selectedApplication.folderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.openFolder}>
                    Open Drive folder
                    <ArrowTopRightOnSquareIcon aria-hidden="true" />
                  </a>
                ) : null}
              </div>

              {selectedApplication?.documentsError ? (
                <div className={styles.errorBanner}>
                  {selectedApplication.documentsError}
                </div>
              ) : null}

              <div className={styles.documentGrid}>
                {visibleDocuments.map((document) => (
                  <a
                    key={document.id}
                    href={document.webViewLink || document.webContentLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.documentCard}>
                    <DocumentTextIcon aria-hidden="true" />
                    <span>
                      <strong>{document.name}</strong>
                      {documentReviewStatus(document) ? (
                        <em
                          className={
                            documentReviewStatus(document) === "Approved"
                              ? styles.documentStatusApproved
                              : styles.documentStatusRejected
                          }>
                          {documentReviewStatus(document)}
                        </em>
                      ) : null}
                      {document.mimeType}
                    </span>
                    <ArrowTopRightOnSquareIcon aria-hidden="true" />
                  </a>
                ))}
              </div>

              {selectedApplication &&
              selectedApplication.documents?.length === 0 ? (
                <p className={styles.emptyState}>
                  No document files were returned. Use the Drive folder link if
                  the folder exists.
                </p>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {visibleNotifications.length ? (
        <div
          className={styles.notificationStack}
          aria-live="polite"
          aria-label="Dashboard notifications">
          {visibleNotifications.map((notification) => (
            <article key={notification.id} className={styles.dashboardToast}>
              <button
                type="button"
                className={styles.toastDismiss}
                onClick={() => hideDashboardToast(notification.id)}
                aria-label="Dismiss notification">
                x
              </button>
              <button
                type="button"
                className={styles.toastContent}
                onClick={() => openDashboardNotification(notification)}>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {accreditedAdvancedOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setAccreditedAdvancedOpen(false);
          }}>
          <div
            className={styles.searchModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accredited-advanced-search-title">
            <span className={styles.modalKicker}>Accredited MTVs</span>
            <h2 id="accredited-advanced-search-title">Advanced Search</h2>
            <div className={styles.filterGrid}>
              <label>
                <span>Registration No.</span>
                <input
                  type="text"
                  value={accreditedAdvancedFilters.reference}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter(
                      "reference",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label>
                <span>Plate No.</span>
                <input
                  type="text"
                  value={accreditedAdvancedFilters.plate}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter("plate", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Establishment Name</span>
                <input
                  type="text"
                  value={accreditedAdvancedFilters.establishment}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter(
                      "establishment",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label>
                <span>Establishment Type</span>
                <select
                  value={accreditedAdvancedFilters.establishmentType}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter(
                      "establishmentType",
                      event.target.value,
                    )
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
                  value={accreditedAdvancedFilters.owner}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter("owner", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={accreditedAdvancedFilters.status}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter("status", event.target.value)
                  }>
                  <option value="All">All statuses</option>
                  {ACCREDITED_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.dateFilterField}>
                <div className={styles.fieldHeader}>
                  <span>Date Issued</span>
                  <label className={styles.inlineCheckbox}>
                    <input
                      type="checkbox"
                      checked={accreditedAdvancedFilters.issuedDateRange}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "issuedDateRange",
                          event.target.checked,
                        )
                      }
                    />
                    <span>Date range</span>
                  </label>
                </div>
                {accreditedAdvancedFilters.issuedDateRange ? (
                  <div className={styles.dateRangeInputs}>
                    <input
                      type="date"
                      aria-label="Date issued start date"
                      value={accreditedAdvancedFilters.issuedStartDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "issuedStartDate",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      type="date"
                      aria-label="Date issued end date"
                      value={accreditedAdvancedFilters.issuedEndDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "issuedEndDate",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="2026"
                    value={accreditedAdvancedFilters.issuedYear}
                    onChange={(event) =>
                      updateAccreditedAdvancedFilter(
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
                      checked={accreditedAdvancedFilters.expiryDateRange}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "expiryDateRange",
                          event.target.checked,
                        )
                      }
                    />
                    <span>Date range</span>
                  </label>
                </div>
                {accreditedAdvancedFilters.expiryDateRange ? (
                  <div className={styles.dateRangeInputs}>
                    <input
                      type="date"
                      aria-label="Expiry start date"
                      value={accreditedAdvancedFilters.expiryStartDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "expiryStartDate",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      type="date"
                      aria-label="Expiry end date"
                      value={accreditedAdvancedFilters.expiryEndDate}
                      onClick={openNativeDatePicker}
                      onChange={(event) =>
                        updateAccreditedAdvancedFilter(
                          "expiryEndDate",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="2026"
                    value={accreditedAdvancedFilters.expiryYear}
                    onChange={(event) =>
                      updateAccreditedAdvancedFilter(
                        "expiryYear",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                )}
              </div>
              <div className={styles.checkboxField}>
                <input
                  id="dashboard-expiring-soon-only"
                  type="checkbox"
                  checked={accreditedAdvancedFilters.expiringSoonOnly}
                  onChange={(event) =>
                    updateAccreditedAdvancedFilter(
                      "expiringSoonOnly",
                      event.target.checked,
                    )
                  }
                />
                <label
                  className={styles.checkboxLabel}
                  htmlFor="dashboard-expiring-soon-only">
                  Expiring soon only
                </label>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={clearAccreditedAdvancedFilters}>
                Clear filters
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => setAccreditedAdvancedOpen(false)}>
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingAccreditedRecord ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelStatusChange();
          }}>
          <div
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accredited-cancel-title">
            <span className={styles.kicker}>Confirm Cancellation</span>
            <h2 id="accredited-cancel-title">Cancel accredited MTV?</h2>
            <p>
              This will mark{" "}
              <strong>{pendingAccreditedRecord.reference}</strong> with plate{" "}
              <strong>{pendingAccreditedRecord.plate || "No plate"}</strong> as{" "}
              <strong>Cancelled</strong> in the Accredited sheet.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={saving}
                onClick={cancelStatusChange}>
                Keep active
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={saving}
                onClick={confirmAccreditedCancellation}>
                {saving ? "Cancelling..." : "Cancel MTV"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bannedModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setBannedModalOpen(false);
            }
          }}>
          <form
            className={styles.searchModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="banned-form-title"
            onSubmit={submitBannedRecord}>
            <span className={styles.modalKicker}>Banned MTV</span>
            <h2 id="banned-form-title">Add banned MTV</h2>
            <div className={styles.filterGrid}>
              <label>
                <span>
                  Plate No. <span className={styles.requiredMark}>*</span>
                </span>
                <input
                  type="text"
                  value={bannedForm.plate}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      plate: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="ABC 1234"
                  required
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={bannedForm.status}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }>
                  {BANNED_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Business Name</span>
                <input
                  type="text"
                  value={bannedForm.business}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      business: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Owner</span>
                <input
                  type="text"
                  value={bannedForm.owner}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      owner: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Date Banned</span>
                <input
                  type="date"
                  value={bannedForm.date}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.fullWidthField}>
                <span>
                  Reason <span className={styles.requiredMark}>*</span>
                </span>
                <textarea
                  className={styles.modalTextarea}
                  value={bannedForm.reason}
                  onChange={(event) =>
                    setBannedForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={saving}
                onClick={() => setBannedModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.dangerButton}
                disabled={saving}>
                {saving ? "Adding..." : "Add banned MTV"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingStatus && selectedApplication ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelStatusChange();
          }}>
          <div
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title">
            <span className={styles.kicker}>Confirm Status Update</span>
            <h2 id="status-confirm-title">Update application status?</h2>
            <p>
              This will change <strong>{selectedApplication.reference}</strong>{" "}
              from <strong>{selectedApplication.status}</strong> to{" "}
              <strong>{pendingStatus}</strong>. The applicant and NMIS will be
              notified by email.
            </p>
            <label className={styles.modalLabel} htmlFor="status-remarks">
              Remarks{" "}
              {REMARKS_REQUIRED_STATUSES.includes(pendingStatus) ? (
                <span className={styles.requiredMark}>*</span>
              ) : null}
            </label>
            <textarea
              id="status-remarks"
              className={styles.modalTextarea}
              required={REMARKS_REQUIRED_STATUSES.includes(pendingStatus)}
              disabled={isViewOnlyLocked}
              value={pendingRemarks}
              onChange={(event) => setPendingRemarks(event.target.value)}
              placeholder={
                pendingStatus === "Rejected Application"
                  ? "Tell the applicant what information or documents must be amended."
                  : pendingStatus === "Rejected Proof of Payment"
                    ? "Tell the applicant what proof of payment issue must be corrected."
                    : pendingStatus === "Cancelled"
                      ? "State the reason for cancelling this application."
                      : "Add optional notes for this status update."
              }
              rows={4}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={saving}
                onClick={cancelStatusChange}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                disabled={
                  saving ||
                  isViewOnlyLocked ||
                  (REMARKS_REQUIRED_STATUSES.includes(pendingStatus) &&
                    !pendingRemarks.trim())
                }
                onClick={confirmStatusChange}>
                {saving ? "Updating..." : "Confirm update"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
