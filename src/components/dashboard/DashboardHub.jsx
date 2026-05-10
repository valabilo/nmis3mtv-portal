"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import StatusTag from "@/components/ui/StatusTag";
import styles from "./DashboardHub.module.css";

const STATUSES = [
  "Pending",
  "For Review",
  "Under Review",
  "For Inspection",
  "Approved",
  "Released",
  "Completed",
  "Rejected",
  "Denied",
];

const TABS = [
  { id: "overview", label: "Overview", icon: Squares2X2Icon },
  { id: "applications", label: "Applications", icon: ClipboardDocumentListIcon },
  { id: "accredited", label: "Accredited", icon: ShieldCheckIcon },
  { id: "details", label: "Details", icon: DocumentTextIcon },
  { id: "documents", label: "Documents", icon: FolderOpenIcon },
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
  ["Drive Folder", "folderUrl"],
];

const ACCREDITED_EXPORT_COLUMNS = [
  ["Date Issued", "approvedAt"],
  ["Name of Owner", "owner"],
  ["Address", "address"],
  ["Establishment Type", "type"],
  ["Establishment Name", "business"],
  ["Plate", "plate"],
  ["Registration No.", "reference"],
  ["Expiry", "expiry"],
  ["Receipt No.", "receiptNo"],
  ["Status", "status"],
  ["Remarks", "remarks"],
];

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
  return (
    snapshot.applicationType === "Amendment" ||
    snapshot.latestRemarks.toLowerCase().includes("amendment submitted")
  );
}

function exportCsv({ filenameBase, columns, rows }) {
  const encoder = new TextEncoder();
  const header = `${columns.map(([label]) => csvCell(label)).join(",")}\n`;
  const chunks = [];
  let current = header;
  let currentSize = encoder.encode(current).length;

  rows.forEach((row) => {
    const line = `${columns.map(([, key]) => csvCell(row[key])).join(",")}\n`;
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
          status: "Pending",
          remarks: "Application submitted.",
          timestamp: submittedAt,
        },
      ];

  return (
    <div className={styles.trailList}>
      {items.map((item, index) => (
        <article
          key={`${item.status}-${item.timestamp || index}`}
          className={index === items.length - 1 ? styles.trailItemActive : styles.trailItem}>
          <div className={styles.trailMarker}>
            <span>{index + 1}</span>
          </div>
          <div className={styles.trailContent}>
            <div>
              <strong>{item.status || "Pending"}</strong>
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

function Dropdown({ id, label, value, options, onChange, disabled = false }) {
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <label className={styles.dropdownField} htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <div className={styles.dropdown}>
        <button
          id={id}
          type="button"
          className={styles.dropdownButton}
          disabled={disabled}
          aria-haspopup="listbox">
          <span>{selected?.label || "Select"}</span>
          <ChevronDownIcon aria-hidden="true" />
        </button>
        <div className={styles.dropdownMenu} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? styles.dropdownOptionActive : styles.dropdownOption}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </label>
  );
}

export default function DashboardHub() {
  const knownApplicationsRef = useRef(new Map());
  const knownApplicationsReadyRef = useRef(false);
  const notificationTimersRef = useRef(new Map());
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [applications, setApplications] = useState([]);
  const [accreditedRecords, setAccreditedRecords] = useState([]);
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
  const [accreditedQuery, setAccreditedQuery] = useState("");
  const [accreditedStatusFilter, setAccreditedStatusFilter] = useState("All");
  const [accreditedYearFilter, setAccreditedYearFilter] = useState("All");
  const [accreditedMonthFilter, setAccreditedMonthFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingRemarks, setPendingRemarks] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [recordLock, setRecordLock] = useState(null);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const SidebarToggleIcon = sidebarCollapsed
    ? ChevronDoubleRightIcon
    : ChevronDoubleLeftIcon;
  const isViewOnlyLocked = Boolean(recordLock && !recordLock.isMine);

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
      notificationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      notificationTimersRef.current.clear();
    },
    [],
  );

  async function refreshDashboardData() {
    const refreshed = await fetch("/api/admin/applications", {
      cache: "no-store",
    });
    const refreshedJson = await refreshed.json();

    if (!refreshed.ok || !refreshedJson.success) return;

    setApplications(refreshedJson.data || []);
    knownApplicationsRef.current = buildApplicationSnapshotMap(refreshedJson.data || []);
    knownApplicationsReadyRef.current = true;
    setAccreditedRecords(refreshedJson.accredited || []);
    setStats((current) => ({ ...current, ...(refreshedJson.stats || {}) }));
  }

  function pushDashboardNotification(notification) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const nextNotification = { id, ...notification };

    setDashboardNotifications((items) => [...items, nextNotification].slice(-4));

    const timer = window.setTimeout(() => {
      setDashboardNotifications((items) => items.filter((item) => item.id !== id));
      notificationTimersRef.current.delete(id);
    }, 9000);

    notificationTimersRef.current.set(id, timer);
  }

  function dismissDashboardNotification(id) {
    const timer = notificationTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    notificationTimersRef.current.delete(id);
    setDashboardNotifications((items) => items.filter((item) => item.id !== id));
  }

  function detectApplicationNotifications(records) {
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

      if (!before) {
        pushDashboardNotification({
          title: "New application received",
          message: `${reference} from ${application.registeredOwner || "an applicant"}`,
          reference,
          tab: "details",
        });
        return;
      }

      const changed =
        before.timestamp !== after.timestamp ||
        before.statusHistoryLength !== after.statusHistoryLength ||
        before.latestTimestamp !== after.latestTimestamp;

      if (changed && isAmendmentSnapshot(after)) {
        pushDashboardNotification({
          title: "Application amendment received",
          message: `${reference} has been resubmitted with corrected details or documents.`,
          reference,
          tab: "details",
        });
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
        detectApplicationNotifications(records);
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
      applications.find((application) => application.reference === selectedRef) ||
      applications[0] ||
      null,
    [applications, selectedRef],
  );

  useEffect(() => {
    setDraftStatus(selectedApplication?.status || "");
  }, [selectedApplication]);

  useEffect(() => {
    const documents = selectedApplication?.documents || [];
    if (!documents.length) {
      setSelectedDocumentId("");
      return;
    }

    const currentStillExists = documents.some(
      (document) => document.id === selectedDocumentId,
    );
    if (!currentStillExists) setSelectedDocumentId(documents[0].id);
  }, [selectedApplication, selectedDocumentId]);

  const selectedDocument = useMemo(() => {
    const documents = selectedApplication?.documents || [];
    return (
      documents.find((document) => document.id === selectedDocumentId) ||
      documents[0] ||
      null
    );
  }, [selectedApplication, selectedDocumentId]);

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
    const reviewStatuses = ["For Review", "Under Review", "For Inspection"];
    const approvedStatuses = ["Approved", "Released", "Completed"];
    const flaggedStatuses = ["Rejected", "Denied"];

    return applications.filter((application) => {
      const submittedDate = recordYearMonth(application.timestamp);
      const matchesStatus =
        statusFilter === "All" ||
        application.status === statusFilter ||
        (statusFilter === "ReviewGroup" &&
          reviewStatuses.includes(application.status)) ||
        (statusFilter === "ApprovedGroup" &&
          approvedStatuses.includes(application.status)) ||
        (statusFilter === "FlaggedGroup" &&
          flaggedStatuses.includes(application.status));
      const matchesYear = yearFilter === "All" || submittedDate.year === yearFilter;
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

  const filteredAccreditedRecords = useMemo(() => {
    const normalizedQuery = accreditedQuery.trim().toLowerCase();

    return accreditedRecords.filter((record) => {
      const recordDate = recordYearMonth(record.approvedAt || record.expiry);
      const matchesStatus =
        accreditedStatusFilter === "All" || record.status === accreditedStatusFilter;
      const matchesYear =
        accreditedYearFilter === "All" || recordDate.year === accreditedYearFilter;
      const matchesMonth =
        accreditedMonthFilter === "All" || recordDate.month === accreditedMonthFilter;
      const searchText = [
        record.reference,
        record.plate,
        record.business,
        record.owner,
        record.address,
        record.telNo,
        record.receiptNo,
        record.status,
        record.remarks,
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
  }, [
    accreditedRecords,
    accreditedQuery,
    accreditedStatusFilter,
    accreditedYearFilter,
    accreditedMonthFilter,
  ]);

  const accreditedYears = useMemo(() => {
    const years = accreditedRecords
      .map((record) => yearFromValue(record.approvedAt) || yearFromValue(record.expiry))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [accreditedRecords]);

  const metrics = useMemo(() => {
    const pending = applications.filter((item) => item.status === "Pending").length;
    const activeReview = applications.filter((item) =>
      ["For Review", "Under Review", "For Inspection"].includes(item.status),
    ).length;
    const approved = applications.filter((item) =>
      ["Approved", "Released", "Completed"].includes(item.status),
    ).length;
    const flagged = applications.filter((item) =>
      ["Rejected", "Denied"].includes(item.status),
    ).length;

    return { pending, activeReview, approved, flagged };
  }, [applications]);

  const statusOptions = [
    { value: "All", label: "All statuses" },
    { value: "ReviewGroup", label: "In review" },
    { value: "ApprovedGroup", label: "Approved / released" },
    { value: "FlaggedGroup", label: "Rejected / denied" },
    ...STATUSES.map((status) => ({ value: status, label: status })),
  ];
  const yearOptions = [
    { value: "All", label: "All years" },
    ...applicationYears.map((year) => ({ value: year, label: year })),
  ];
  const monthOptions = [
    { value: "All", label: "All months" },
    ...MONTHS.map(([value, label]) => ({ value, label })),
  ];
  const accreditedStatusOptions = [
    { value: "All", label: "All statuses" },
    { value: "Active", label: "Active" },
    { value: "Expired", label: "Expired" },
    { value: "Suspended", label: "Suspended" },
    { value: "Revoked", label: "Revoked" },
  ];
  const accreditedYearOptions = [
    { value: "All", label: "All years" },
    ...accreditedYears.map((year) => ({ value: year, label: year })),
  ];
  function handleStatusChangeRequest(nextStatus) {
    if (isViewOnlyLocked) {
      setError(`${recordLock.owner} is currently editing this record. View-only mode is enabled.`);
      return;
    }
    if (!selectedApplication || nextStatus === selectedApplication.status) return;
    setPendingStatus(nextStatus);
    setPendingRemarks("");
  }

  async function submitStatusUpdate(nextStatus, successPrefix) {
    if (isViewOnlyLocked) {
      setError(`${recordLock.owner} is currently editing this record. View-only mode is enabled.`);
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

      const effectMessages = [];
      if (nextStatus === "Completed") {
        effectMessages.push(
          json.effects?.accredited
            ? "Accredited sheet synced."
            : "Accredited sheet did not sync.",
        );
      }
      effectMessages.push(
        json.effects?.applicantEmail
          ? "Applicant emailed."
          : "Applicant email was not sent.",
      );
      effectMessages.push(
        json.effects?.nmisEmail ? "NMIS emailed." : "NMIS email was not sent.",
      );
      if (json.effects?.errors?.length) {
        effectMessages.push(json.effects.errors.join(" "));
      }
      setNotice(`${successPrefix || `Status updated to ${nextStatus}.`} ${effectMessages.join(" ")}`);
      setDraftStatus(nextStatus);
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setSaving(false);
      setPendingStatus("");
      setPendingRemarks("");
    }
  }

  async function confirmStatusChange() {
    if (isViewOnlyLocked) {
      setError(`${recordLock.owner} is currently editing this record. View-only mode is enabled.`);
      setPendingStatus("");
      setPendingRemarks("");
      return;
    }
    if (!selectedApplication || !pendingStatus) return;

    if (pendingStatus === "Rejected" && !pendingRemarks.trim()) {
      setError("Remarks are required when rejecting an application.");
      return;
    }

    await submitStatusUpdate(pendingStatus, `Status updated to ${pendingStatus}.`);
  }

  function cancelStatusChange() {
    if (saving) return;
    setDraftStatus(selectedApplication?.status || "");
    setPendingStatus("");
    setPendingRemarks("");
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

  function exportAccredited() {
    const parts = exportCsv({
      filenameBase: "mtv-accredited",
      columns: ACCREDITED_EXPORT_COLUMNS,
      rows: filteredAccreditedRecords,
    });
    setNotice(
      `Exported ${filteredAccreditedRecords.length} filtered accredited records${parts > 1 ? ` into ${parts} files` : ""}.`,
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
            <strong>Admin Console</strong>
            <small>RTOC III</small>
          </div>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        {notice ? <div className={styles.noticeBanner}>{notice}</div> : null}
        {recordLock && !recordLock.isMine ? (
          <div className={styles.warningBanner}>
            {recordLock.owner} is currently editing {recordLock.reference}. Please
            coordinate before updating this record.
          </div>
        ) : null}

        {activeTab === "overview" && (
          <section className={styles.section}>
            <div className={styles.metricsGrid}>
              <MetricCard
                label="Pending"
                value={loading ? "..." : metrics.pending}
                helper="New submissions waiting for intake review."
                tone="pendingTone"
                onClick={() => openApplicationFilter("Pending")}
              />
              <MetricCard
                label="In Review"
                value={loading ? "..." : metrics.activeReview}
                helper="Applications currently being evaluated."
                tone="reviewTone"
                onClick={() => openApplicationFilter("ReviewGroup")}
              />
              <MetricCard
                label="Approved / Released"
                value={loading ? "..." : metrics.approved}
                helper="Records ready for payment, release, or completion."
                tone="approvedTone"
                onClick={() => openApplicationFilter("ApprovedGroup")}
              />
              <MetricCard
                label="Rejected / Denied"
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
                <span className={styles.kicker}>Accredited in {stats.year}</span>
                <strong>{loading ? "..." : stats.accreditedThisYear}</strong>
                <p>Records approved or added during the current year.</p>
              </article>
              <article className={styles.statPanel}>
                <span className={styles.kicker}>GHP Certificates in {stats.year}</span>
                <strong>{loading ? "..." : stats.ghpIssuedThisYear}</strong>
                <p>Certificates issued from the GHP completions sheet this year.</p>
              </article>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Queue</span>
                  <h2>Recent Applications</h2>
                </div>
                <button type="button" onClick={() => setActiveTab("applications")}>
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
                          selectedApplication?.reference === application.reference
                            ? styles.selectedRow
                            : ""
                        }
                        onClick={() => selectApplication(application.reference)}>
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

        {activeTab === "accredited" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Accredited</span>
                  <h2>Active MTV Records</h2>
                </div>
                <Link href="/verify" className={styles.openFolder}>
                  Public verification
                  <ArrowTopRightOnSquareIcon aria-hidden="true" />
                </Link>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <MagnifyingGlassIcon aria-hidden="true" />
                  <input
                    type="text"
                    value={accreditedQuery}
                    onChange={(event) => setAccreditedQuery(event.target.value)}
                    placeholder="Search registration no., plate, establishment, owner..."
                  />
                </div>
                <Dropdown
                  id="accredited-status-filter"
                  value={accreditedStatusFilter}
                  options={accreditedStatusOptions}
                  onChange={setAccreditedStatusFilter}
                />
                <Dropdown
                  id="accredited-year-filter"
                  value={accreditedYearFilter}
                  options={accreditedYearOptions}
                  onChange={setAccreditedYearFilter}
                />
                <Dropdown
                  id="accredited-month-filter"
                  value={accreditedMonthFilter}
                  options={monthOptions}
                  onChange={setAccreditedMonthFilter}
                />
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={exportAccredited}
                  disabled={filteredAccreditedRecords.length === 0}>
                  <ArrowDownTrayIcon aria-hidden="true" />
                  Export
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th className={styles.noWrap}>Date Issued</th>
                      <th>Owner</th>
                      <th>Address</th>
                      <th>Establishment Type</th>
                      <th>Establishment Name</th>
                      <th>Plate</th>
                      <th className={styles.noWrap}>Registration No.</th>
                      <th className={styles.noWrap}>Expiry</th>
                      <th>Receipt No.</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccreditedRecords.map((record) => (
                      <tr key={`${record.reference}-${record.plate}`}>
                        <td className={styles.noWrap}>
                          {formatDate(record.approvedAt)}
                        </td>
                        <td>{record.owner || "Not provided"}</td>
                        <td>{record.address || "Not provided"}</td>
                        <td>{record.type || "Not provided"}</td>
                        <td>{record.business || "Not provided"}</td>
                        <td>
                          <strong>{record.plate || "No plate"}</strong>
                        </td>
                        <td className={styles.noWrap}>
                          {record.reference || "No registration no."}
                        </td>
                        <td className={styles.noWrap}>
                          {formatDate(record.expiry)}
                        </td>
                        <td>{record.receiptNo || "Not provided"}</td>
                        <td>
                          <StatusTag status={record.status || "Active"} />
                        </td>
                        <td>{record.remarks || "Not provided"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && filteredAccreditedRecords.length === 0 ? (
                  <p className={styles.emptyState}>No accredited records found.</p>
                ) : null}
                {loading ? <div className="spinner" /> : null}
              </div>
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
                          options={STATUSES.map((status) => ({
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
                          onClick={() => handleStatusChangeRequest(draftStatus)}>
                          Update status
                        </button>
                      </div>
                      {isViewOnlyLocked ? (
                        <p className={styles.readOnlyNote}>
                          View-only mode while {recordLock.owner} edits this record.
                        </p>
                      ) : null}
                    </div>

                    <div className={styles.infoGrid}>
                      <InfoRow label="Owner" value={selectedApplication.registeredOwner} />
                      <InfoRow label="Email" value={selectedApplication.email} />
                      <InfoRow label="Contact" value={selectedApplication.contact} />
                      <InfoRow label="Address" value={selectedApplication.address} />
                      <InfoRow label="Province" value={selectedApplication.province} />
                      <InfoRow label="GHP Certificate" value={selectedApplication.ghpCertNumber} />
                      <InfoRow label="Application Type" value={selectedApplication.applicationType} />
                      <InfoRow label="Submitted" value={formatDate(selectedApplication.timestamp)} />
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
                      <InfoRow label="Plate Number" value={selectedApplication.plate} />
                      <InfoRow label="Vehicle Type" value={selectedApplication.vehicleType} />
                      <InfoRow label="Make" value={selectedApplication.vehicleMake} />
                      <InfoRow label="Model" value={selectedApplication.vehicleModel} />
                      <InfoRow label="Year" value={selectedApplication.vehicleYear} />
                      <InfoRow label="Capacity" value={selectedApplication.capacity} />
                      <InfoRow label="Color" value={selectedApplication.vehicleColor} />
                      <InfoRow label="Engine Number" value={selectedApplication.engineNumber} />
                      <InfoRow label="Chassis Number" value={selectedApplication.chassisNumber} />
                      <InfoRow label="CR Number" value={selectedApplication.crNumber} />
                      <InfoRow label="OR Number" value={selectedApplication.orNumber} />
                      <InfoRow label="Cooling System" value={selectedApplication.coolingSystem} />
                      <InfoRow label="Material" value={selectedApplication.material} />
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
                      <InfoRow label="Business Name" value={selectedApplication.businessName} />
                      <InfoRow label="Business Type" value={selectedApplication.businessType} />
                      <InfoRow label="Business Address" value={selectedApplication.businessAddress} />
                      <InfoRow label="Meat Establishment" value={selectedApplication.meatEstablishment} />
                      <InfoRow label="Intended Route" value={selectedApplication.intendedRoute} />
                      <InfoRow label="Latest Remarks" value={selectedApplication.remarks} />
                    </div>
                  </div>

                  <div className={`${styles.panel} ${styles.trailPanel}`}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Paper Trail</span>
                        <h2>Application Progress</h2>
                      </div>
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
                      <h2>{selectedDocument?.name || "No document selected"}</h2>
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

                  {selectedApplication.documents?.length ? (
                    <>
                      <div className={styles.reviewDocumentSelect}>
                        <Dropdown
                          id="document-review"
                          label="Document"
                          value={selectedDocument?.id || ""}
                          options={selectedApplication.documents.map((document) => ({
                            value: document.id,
                            label: document.name,
                          }))}
                          onChange={setSelectedDocumentId}
                        />
                      </div>

                      {selectedDocument ? (
                        <iframe
                          className={styles.documentPreview}
                          src={getDocumentPreviewUrl(selectedDocument)}
                          title={`Preview of ${selectedDocument.name}`}
                          loading="lazy"
                        />
                      ) : null}
                    </>
                  ) : (
                    <p className={styles.emptyState}>
                      No document files were returned for this application.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.emptyState}>Select an application to view details.</p>
            )}
          </section>
        )}

        {activeTab === "documents" && (
          <section className={styles.section}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Documents</span>
                  <h2>{selectedApplication?.reference || "No application selected"}</h2>
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
                {(selectedApplication?.documents || []).map((document) => (
                  <a
                    key={document.id}
                    href={document.webViewLink || document.webContentLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.documentCard}>
                    <DocumentTextIcon aria-hidden="true" />
                    <span>
                      <strong>{document.name}</strong>
                      {document.mimeType}
                    </span>
                    <ArrowTopRightOnSquareIcon aria-hidden="true" />
                  </a>
                ))}
              </div>

              {selectedApplication && selectedApplication.documents?.length === 0 ? (
                <p className={styles.emptyState}>
                  No document files were returned. Use the Drive folder link if
                  the folder exists.
                </p>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {dashboardNotifications.length ? (
        <div
          className={styles.notificationStack}
          aria-live="polite"
          aria-label="Dashboard notifications">
          {dashboardNotifications.map((notification) => (
            <article key={notification.id} className={styles.dashboardToast}>
              <button
                type="button"
                className={styles.toastDismiss}
                onClick={() => dismissDashboardNotification(notification.id)}
                aria-label="Dismiss notification">
                x
              </button>
              <button
                type="button"
                className={styles.toastContent}
                onClick={() => {
                  selectApplication(notification.reference, notification.tab || "details");
                  dismissDashboardNotification(notification.id);
                }}>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </button>
            </article>
          ))}
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
              Remarks {pendingStatus === "Rejected" ? <span className={styles.requiredMark}>*</span> : null}
            </label>
            <textarea
              id="status-remarks"
              className={styles.modalTextarea}
              required={pendingStatus === "Rejected"}
              disabled={isViewOnlyLocked}
              value={pendingRemarks}
              onChange={(event) => setPendingRemarks(event.target.value)}
              placeholder={
                pendingStatus === "Rejected"
                  ? "Tell the applicant what information or documents must be amended."
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
                  (pendingStatus === "Rejected" && !pendingRemarks.trim())
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
