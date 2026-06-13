"use client";
/**
 * components/apply/ApplicationForm.jsx
 *
 * Orchestrates the 4-step MTV application form.
 *
 * UPLOAD STRATEGY — solves both problems:
 *   Problem 1: Vercel 4.5 MB payload limit  → solved by chunking (4 MB per chunk)
 *   Problem 2: CORS blocks browser→Google   → solved by proxying through our API
 *
 * Flow per file:
 *   1. POST /api/drive/create-folder  → folderId
 *   2. POST /api/drive/init-upload    → resumable uploadUrl (server creates session)
 *   3. For each 4 MB chunk:
 *        POST /api/drive/upload-chunk  → chunk forwarded server→Google (no CORS)
 *   4. POST /api/applications         → JSON metadata only (tiny, no files)
 *
 * VALIDATION ORDER:
 *   All field, document, and GHP certificate validations run BEFORE any API
 *   call (ref number generation, folder creation, or file upload). Nothing
 *   is sent to the server until every check passes.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { REQUIRED_DOCS } from "@/data/requiredDocs";
import Toast from "@/components/ui/Toast";
import FormProgress from "./FormProgress";
import Step1Applicant from "./Step1Applicant";
import Step2Vehicle from "./Step2Vehicle";
import Step3Documents from "./Step3Documents";
import Step4Review from "./Step4Review";
import SuccessView from "./SuccessView";
import styles from "./ApplicationForm.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB — safely under Vercel's 4.5 MB limit

const INITIAL_FORM = {
  applicationType: "New",
  registeredOwner: "",
  email: "",
  contact: "",
  address: "",
  region: "III",
  province: "",
  plate: "",
  vtype: "",
  vmake: "",
  vmodel: "",
  vyear: "",
  vcolor: "",
  vengine: "",
  vchassis: "",
  crNumber: "",
  orNumber: "",
  ltoClientId: "",
  bodyType: "",
  fuelType: "",
  cooling: "",
  capacity: "",
  grossWeight: "",
  netCapacity: "",
  material: "",
  meatEstablishment: "",
  intendedRoute: "",
  bname: "",
  btype: "",
  baddress: "",
  ghpCertNumber: "",
  amendmentRef: "",
};

const DRAFT_STORAGE_KEY = "mtv-application-draft-v1";

// ─── Human-readable field labels used in toast messages ──────────────────────
const FIELD_LABELS = {
  registeredOwner: "Registered Owner",
  email: "Email Address",
  contact: "Contact Number",
  address: "Complete Address",
  region: "Region",
  province: "Province",
  applicationType: "Application Type",
  plate: "Plate Number",
  vtype: "Vehicle Type",
  vmake: "Vehicle Make",
  vmodel: "Vehicle Model",
  vyear: "Vehicle Year",
  crNumber: "CR Number",
  orNumber: "OR Number",
  capacity: "Load Capacity",
  btype: "Business Type",
  meatEstablishment: "Meat Establishment",
  intendedRoute: "Intended Route",
};

// Required fields per step — used both in per-step navigation and final pre-submit check.
const REQUIRED_BY_STEP = {
  1: [
    "applicationType",
    "registeredOwner",
    "email",
    "contact",
    "address",
    "region",
    "province",
  ],
  2: [
    "plate",
    "vtype",
    "vmake",
    "vmodel",
    "vyear",
    "crNumber",
    "orNumber",
    "capacity",
    "btype",
    "meatEstablishment",
    "intendedRoute",
  ],
  3: [], // documents + agreement are checked separately
};

// ─── Draft helpers ────────────────────────────────────────────────────────────
function normalizeDraftForm(savedForm) {
  if (!savedForm || typeof savedForm !== "object") return INITIAL_FORM;
  return Object.keys(INITIAL_FORM).reduce((draft, key) => {
    draft[key] =
      typeof savedForm[key] === "string" ? savedForm[key] : INITIAL_FORM[key];
    return draft;
  }, {});
}

function getSavedDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const savedStep = Math.min(Math.max(Number(draft.step) || 1, 1), 4);
    return {
      formData: normalizeDraftForm(draft.formData),
      step: savedStep === 4 ? 3 : savedStep,
      agree: Boolean(draft.agree),
    };
  } catch {
    return null;
  }
}

function clearSavedDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Chunked upload helpers ───────────────────────────────────────────────────

/**
 * Ask our server to open a resumable upload session with Google Drive.
 * Returns the opaque session URL issued by Google.
 */
async function initUpload({ fileName, mimeType, folderId, fileSize }) {
  const res = await fetch("/api/drive/init-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, mimeType, folderId, fileSize }),
  });
  const json = await res.json();
  if (!json.success)
    throw new Error(json.error || "Failed to initialise upload");
  return json.uploadUrl;
}

/**
 * Proxy one chunk through our server route to Google Drive.
 * Avoids CORS and keeps each request under Vercel's 4.5 MB limit.
 */
async function sendChunk({
  uploadUrl,
  chunk,
  rangeStart,
  rangeEnd,
  totalSize,
  isLast,
}) {
  const form = new FormData();
  form.append("uploadUrl", uploadUrl);
  form.append("chunk", chunk); // Blob
  form.append("rangeStart", String(rangeStart));
  form.append("rangeEnd", String(rangeEnd));
  form.append("totalSize", String(totalSize));
  form.append("isLast", isLast ? "true" : "false");

  const res = await fetch("/api/drive/upload-chunk", {
    method: "POST",
    body: form,
    // No Content-Type header — browser sets multipart boundary automatically
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Chunk upload failed");
  return json; // { done, fileId? }
}

/**
 * Full chunked upload for one file.
 * File name pattern: <refNumber>_<docId>_<originalName>
 *   e.g. MTV-2026-000001_ghp_attendance_cert.pdf
 */
async function uploadFileInChunks({
  file,
  folderId,
  refNumber,
  docId,
  onProgress,
}) {
  const totalSize = file.size;

  // Build a sanitised file name that identifies the ref, document type, and original name.
  const fileName = `${refNumber}_${docId}_${file.name}`
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 200);

  // 1. Open the resumable session on the server
  const uploadUrl = await initUpload({
    fileName,
    mimeType: file.type || "application/octet-stream",
    folderId,
    fileSize: totalSize,
  });

  let offset = 0;
  let fileId = null;

  // 2. Send each chunk through our proxy
  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = file.slice(offset, end); // Blob slice — zero copy
    const isLast = end === totalSize;

    const result = await sendChunk({
      uploadUrl,
      chunk,
      rangeStart: offset,
      rangeEnd: end - 1, // Google's Content-Range is inclusive on the end
      totalSize,
      isLast,
    });

    offset = end;
    if (onProgress) onProgress(Math.round((offset / totalSize) * 100));

    if (result.done) {
      fileId = result.fileId;
      break;
    }
  }

  return { docId, fileName, size: totalSize, fileId };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ApplicationForm() {
  const searchParams = useSearchParams();
  const amendmentRef = searchParams.get("amend") || "";
  const normalizedAmendmentRef = amendmentRef.trim().toUpperCase();
  const formRef = useRef(null);
  const optimisticRef = useRef(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [originalAmendmentData, setOriginalAmendmentData] = useState(null);
  const [files, setFiles] = useState({});
  const [agree, setAgree] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [amendmentFolderId, setAmendmentFolderId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validatingGhp, setValidatingGhp] = useState(false);
  const [loadingAmendment, setLoadingAmendment] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalPlate, setRenewalPlate] = useState("");
  const [renewalLookupLoading, setRenewalLookupLoading] = useState(false);
  const [renewalLookupError, setRenewalLookupError] = useState("");
  const [renewalPlateLocked, setRenewalPlateLocked] = useState(false);
  const [establishmentTypes, setEstablishmentTypes] = useState([]);
  const [establishmentNames, setEstablishmentNames] = useState([]);
  const [loadingEstablishmentTypes, setLoadingEstablishmentTypes] =
    useState(false);
  const [loadingEstablishmentNames, setLoadingEstablishmentNames] =
    useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState({}); // docId → 0-100
  const [draftReady, setDraftReady] = useState(false);
  const [amendmentClosedMessage, setAmendmentClosedMessage] = useState("");
  const [, startTransition] = useTransition();

  const { toastState, showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDropdownOptions() {
      setLoadingEstablishmentTypes(true);
      setLoadingEstablishmentNames(true);
      try {
        const [typeRes, nameRes] = await Promise.all([
          fetch("/api/establishment-types", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/establishment-names", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const [typeJson, nameJson] = await Promise.all([
          typeRes.json(),
          nameRes.json(),
        ]);
        if (!typeRes.ok || !typeJson.success) {
          throw new Error(
            typeJson.error || "Unable to load establishment types.",
          );
        }
        if (!nameRes.ok || !nameJson.success) {
          throw new Error(
            nameJson.error || "Unable to load establishment names.",
          );
        }
        if (!cancelled) {
          setEstablishmentTypes(typeJson.data || []);
          setEstablishmentNames(nameJson.data || []);
        }
      } catch (error) {
        if (!cancelled && error.name !== "AbortError") {
          setEstablishmentTypes([]);
          setEstablishmentNames([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEstablishmentTypes(false);
          setLoadingEstablishmentNames(false);
        }
      }
    }

    loadDropdownOptions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const submissionId = useMemo(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    [],
  );

  // Load draft on mount, or preload the existing application for amendments.
  useEffect(() => {
    let cancelled = false;
    const draft = getSavedDraft();

    async function loadAmendment() {
      setLoadingAmendment(true);
      setAmendmentClosedMessage("");
      const draftMatchesAmendment =
        draft?.formData?.amendmentRef === normalizedAmendmentRef;

      if (draftMatchesAmendment) {
        setFormData({
          ...draft.formData,
          applicationType: "Amendment",
          amendmentRef: normalizedAmendmentRef,
        });
        setRenewalPlateLocked(false);
        setStep(draft.step);
        setAgree(draft.agree);
      } else {
        setFormData((prev) => ({
          ...prev,
          applicationType: "Amendment",
          amendmentRef: normalizedAmendmentRef,
        }));
        setRenewalPlateLocked(false);
      }

      try {
        const res = await fetch(
          `/api/applications/amendment?ref=${encodeURIComponent(normalizedAmendmentRef)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (res.status === 409 && json.code === "AMENDMENT_ALREADY_SUBMITTED") {
            setAmendmentClosedMessage(
              json.error ||
                "The record has been amended and already submitted. Please wait for NMIS to verify the record.",
            );
            setStep(1);
            setAgree(false);
            return;
          }

          throw new Error(json.error || "Unable to load amendment details.");
        }
        if (cancelled) return;

        const application = json.application || {};
        setAmendmentFolderId(application.folderId || "");
        setOriginalAmendmentData({
          ...application,
          applicationType: "Amendment",
          amendmentRef: normalizedAmendmentRef,
        });
        setFormData((prev) => ({
          ...prev,
          ...application,
          applicationType: "Amendment",
          amendmentRef: normalizedAmendmentRef,
        }));
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "Unable to load amendment details.", true);
        }
      } finally {
        if (!cancelled) {
          setDraftReady(true);
          setLoadingAmendment(false);
        }
      }
    }

    if (normalizedAmendmentRef) {
      loadAmendment();
      return () => {
        cancelled = true;
      };
    }

    if (draft) {
      setFormData({
        ...draft.formData,
        amendmentRef: "",
      });
      setOriginalAmendmentData(null);
      setRenewalPlateLocked(
        draft.formData.applicationType === "Renewal" && Boolean(draft.formData.plate),
      );
      setStep(draft.step);
      setAgree(draft.agree);
    } else {
      setFormData(INITIAL_FORM);
      setOriginalAmendmentData(null);
      setRenewalPlateLocked(false);
    }
    setAmendmentClosedMessage("");
    setDraftReady(true);

    return () => {
      cancelled = true;
    };
  }, [normalizedAmendmentRef, showToast]);

  // Auto-save draft after every relevant state change
  useEffect(() => {
    if (!draftReady || submitted) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            formData,
            step,
            agree,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* ignore quota errors */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [agree, draftReady, formData, step, submitted]);

  function updateField(key, value) {
    if (key === "plate" && renewalPlateLocked) return;

    if (key === "applicationType") {
      if (value === "Renewal" && !formData.amendmentRef) {
        setFormData((prev) => ({ ...prev, applicationType: "Renewal" }));
        setRenewalPlate(formData.plate || "");
        setRenewalLookupError("");
        setRenewalModalOpen(true);
        return;
      }

      setRenewalModalOpen(false);
      setRenewalLookupError("");
      setRenewalPlateLocked(false);
      if (value === "New") {
        resetToNewApplication();
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function resetToNewApplication() {
    setFormData(INITIAL_FORM);
    setOriginalAmendmentData(null);
    setAmendmentFolderId("");
    setRenewalPlate("");
    setRenewalLookupError("");
    setRenewalPlateLocked(false);
    setFiles({});
    setAgree(false);
  }

  function applyRenewalRecord(record, plate) {
    setFormData((prev) => {
      const next = { ...prev };
      Object.entries(record || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim()) {
          next[key] = value;
        }
      });
      next.applicationType = "Renewal";
      next.amendmentRef = "";
      next.plate = plate || next.plate;
      return next;
    });
    setRenewalPlateLocked(true);
  }

  function closeRenewalModal({ resetType = false } = {}) {
    setRenewalModalOpen(false);
    setRenewalLookupError("");
    if (resetType) {
      resetToNewApplication();
    }
  }

  async function lookupRenewalRecord(event) {
    event?.preventDefault();
    const plate = renewalPlate.trim().toUpperCase();
    if (!plate) {
      setRenewalLookupError("Enter the plate number to find the previous MTV record.");
      return;
    }

    setRenewalLookupLoading(true);
    setRenewalLookupError("");

    try {
      const res = await fetch(
        `/api/applications/renewal?plate=${encodeURIComponent(plate)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Unable to load renewal record.");
      }

      applyRenewalRecord(json.data, plate);
      setRenewalModalOpen(false);
      showToast(
        `Previous MTV record loaded. Current expiry: ${json.currentExpiry}; renewal starts ${json.nextIssueDate}.`,
      );
    } catch (error) {
      const message = error.message || "Unable to load renewal record.";
      resetToNewApplication();
      setRenewalModalOpen(false);
      showToast(message, true);
    } finally {
      setRenewalLookupLoading(false);
    }
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  function scrollToWithinForm(selector) {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector(selector);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    });
  }

  function scrollToField(fieldName, targetStep = step) {
    if (targetStep !== step) {
      setStep(targetStep);
      window.setTimeout(
        () => scrollToWithinForm(`[name="${fieldName}"], #${fieldName}`),
        80,
      );
      return;
    }

    scrollToWithinForm(`[name="${fieldName}"], #${fieldName}`);
  }

  function scrollToDocumentRequirement(docId) {
    setStep(3);
    window.setTimeout(() => scrollToWithinForm(`#doc_${docId}`), 80);
  }

  function scrollToAgreement() {
    setStep(3);
    window.setTimeout(() => scrollToWithinForm("#document-agreement"), 80);
  }

  function scrollToUploadProgress() {
    requestAnimationFrame(() => {
      optimisticRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  /**
   * Validates required fields for a given step.
   * Returns true if valid, shows a toast and returns false if not.
   */
  function runFieldValidation(targetStep) {
    const missing = (REQUIRED_BY_STEP[targetStep] || []).filter(
      (k) => !formData[k]?.trim(),
    );
    if (missing.length) {
      showToast(
        `Please fill in: ${missing.map((k) => FIELD_LABELS[k] || k).join(", ")}.`,
        true,
      );
      scrollToField(missing[0], targetStep);
      return false;
    }
    return true;
  }

  /**
   * Validates step 3: all required documents attached + agreement ticked.
   * Returns true if valid, shows a toast and returns false if not.
   */
  function runDocumentValidation() {
    const missingDocs = formData.amendmentRef
      ? []
      : REQUIRED_DOCS.filter((d) => d.required && !files[d.id]);
    if (missingDocs.length) {
      showToast(
        `Please upload all required documents: ${missingDocs.map((d) => d.name).join(", ")}.`,
        true,
      );
      scrollToDocumentRequirement(missingDocs[0].id);
      return false;
    }
    if (!agree) {
      showToast("Please agree to the certification.", true);
      scrollToAgreement();
      return false;
    }
    return true;
  }

  function isFieldStepComplete(stepNumber) {
    return (REQUIRED_BY_STEP[stepNumber] || []).every((key) =>
      formData[key]?.trim(),
    );
  }

  function isDocumentStepComplete() {
    const hasRequiredDocs =
      formData.amendmentRef ||
      REQUIRED_DOCS.every((doc) => !doc.required || files[doc.id]);

    return hasRequiredDocs && agree;
  }

  function canVisitStep(targetStep) {
    if (targetStep <= step) return true;
    if (targetStep >= 2 && !isFieldStepComplete(1)) return false;
    if (targetStep >= 3 && !isFieldStepComplete(2)) return false;
    if (targetStep >= 4 && !isDocumentStepComplete()) return false;
    return true;
  }

  /**
   * Validates the optional GHP certificate number against the Sheets database.
   * Empty value is always valid (the field is optional).
   * Returns true if valid (or empty), shows a toast and returns false if invalid.
   */
  async function validateOptionalGhpControlNo() {
    const controlNo = formData.ghpCertNumber?.trim();
    if (!controlNo) return true;
    setValidatingGhp(true);
    try {
      const res = await fetch(
        `/api/ghp/certificate?id=${encodeURIComponent(controlNo)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.success || json.certificate?.isExpired) {
        showToast(
          "The GHP certificate number is not valid or has expired. Leave blank or enter a valid one.",
          true,
        );
        return false;
      }
      return true;
    } catch {
      showToast(
        "Unable to validate GHP certificate. Try again or leave the field blank.",
        true,
      );
      return false;
    } finally {
      setValidatingGhp(false);
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Advances to a target step, optionally running field validation first.
   * For step 1 → 2 the GHP cert is also validated when provided.
   */
  async function validateNewPlateIsNotExistingMtv() {
    if (formData.applicationType !== "New" || formData.amendmentRef) return true;

    const plate = formData.plate?.trim();
    if (!plate) return true;

    try {
      const res = await fetch(
        `/api/applications/renewal?mode=status&plate=${encodeURIComponent(plate)}`,
        { cache: "no-store" },
      );
      const json = await res.json();

      if (!json.exists) return true;

      if (json.eligible) {
        showToast(
          "This plate already has an accredited MTV record and is eligible for renewal. Please select Renewal as the application type.",
          true,
        );
        return false;
      }

      showToast(
        json.error ||
          "This plate already has an active MTV record and can only be renewed two months before expiration.",
        true,
      );
      return false;
    } catch {
      showToast("Unable to verify this plate number. Please try again.", true);
      return false;
    }
  }

  async function goToStep(target, validate = false) {
    if (target === step) return;

    if (validate) {
      if (!runFieldValidation(step)) return;
      if (step === 2) {
        const plateOk = await validateNewPlateIsNotExistingMtv();
        if (!plateOk) return;
      }
      // Step 3 requires document + agreement check
      if (step === 3 && !runDocumentValidation()) return;
      // Validate optional GHP cert on step 1 before advancing
      if (step === 1) {
        const ok = await validateOptionalGhpControlNo();
        if (!ok) return;
      }
    }
    setStep(target);
    requestAnimationFrame(() => {
      const top = formRef.current?.getBoundingClientRect().top + window.scrollY;
      if (top)
        window.scrollTo({ top: Math.max(top - 130, 0), behavior: "smooth" });
    });
  }

  // ─── Final submission ────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (submitting) return;

    // ── Pre-flight validation — ALL checks run BEFORE any API call ──────────
    // Step 1 fields (applicant info)
    if (!runFieldValidation(1)) return;
    // Step 2 fields (vehicle info)
    if (!runFieldValidation(2)) return;
    const plateOk = await validateNewPlateIsNotExistingMtv();
    if (!plateOk) return;
    // Step 3: required documents + agreement
    if (!runDocumentValidation()) return;
    // Optional GHP certificate number (async — hits the database)
    const ghpValid = await validateOptionalGhpControlNo();
    if (!ghpValid) return;
    // ── All validations passed — safe to start uploading ────────────────────

    setSubmitting(true);
    setUploadProgress({});
    scrollToUploadProgress();

    try {
      // ── Phase 0: Use the original ref for amendments, generate one for new applications.
      const isAmendment = Boolean(formData.amendmentRef);
      let generatedRefNumber = formData.amendmentRef;
      let folderId = amendmentFolderId;

      if (isAmendment) {
        startTransition(() =>
          setOptimisticMessage("Preparing your application amendment…"),
        );
      } else {
        startTransition(() =>
          setOptimisticMessage("Generating your application reference number…"),
        );

        const refRes = await fetch("/api/generate-ref-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const refJson = await refRes.json();
        if (!refJson.success)
          throw new Error(refJson.error || "Failed to generate reference number");
        generatedRefNumber = refJson.refNumber; // e.g. "MTV-2026-000001"
      }

      // ── Phase 1: Create Drive folder (named with ref number only) ─────────
      // Folder name = ref number only, e.g. "MTV-2026-000001"
      startTransition(() =>
        setOptimisticMessage("Creating your application folder…"),
      );

      if (!folderId) {
        const folderRes = await fetch("/api/drive/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderName: generatedRefNumber }),
        });
        const folderJson = await folderRes.json();
        if (!folderJson.success)
          throw new Error(folderJson.error || "Failed to create Drive folder");
        folderId = folderJson.folderId;
      }

      // ── Phase 2: Upload each file in chunks (proxied through our API) ─────
      // File name pattern: <refNumber>_<docId>_<originalFileName>
      const docEntries = Object.entries(files);
      const uploadedFiles = [];

      for (let i = 0; i < docEntries.length; i++) {
        const [docId, file] = docEntries[i];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        startTransition(() =>
          setOptimisticMessage(
            `Uploading document ${i + 1} of ${docEntries.length}: ${file.name}` +
              (totalChunks > 1 ? ` (${totalChunks} parts)` : "") +
              "…",
          ),
        );
        scrollToUploadProgress();

        const result = await uploadFileInChunks({
          file,
          folderId,
          refNumber: generatedRefNumber, // used as the file name prefix
          docId,
          onProgress: (pct) =>
            setUploadProgress((prev) => ({ ...prev, [docId]: pct })),
        });

        uploadedFiles.push(result);
      }

      // ── Phase 3: Save metadata to Sheets + send emails (no binary data) ───
      startTransition(() =>
        setOptimisticMessage("Saving your application record…"),
      );

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          ...formData,
          folderId,
          refNumber: generatedRefNumber,
          uploadedFiles,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (!json.emailSent) {
        showToast(
          "Application submitted, but the confirmation email failed. Please save your reference number.",
          true,
        );
      }

      setRefNumber(json.refNumber);
      setSubmitted(true);
      clearSavedDraft();
    } catch (err) {
      showToast(err.message || "Submission failed. Please try again.", true);
    } finally {
      setSubmitting(false);
      setOptimisticMessage("");
      setUploadProgress({});
    }
  }

  function handleReset() {
    setStep(1);
    setFormData(INITIAL_FORM);
    setOriginalAmendmentData(null);
    setFiles({});
    setAgree(false);
    setSubmitted(false);
    setRefNumber("");
    clearSavedDraft();
  }

  if (submitted)
    return (
      <SuccessView
        refNumber={refNumber}
        onReset={handleReset}
        isAmendment={Boolean(formData.amendmentRef)}
      />
    );

  // ─── Weighted upload progress ───────────────────────────────────────────────
  if (amendmentClosedMessage) {
    return (
      <>
        <div className={styles.closedContainer} ref={formRef}>
          <div className={styles.closedNotice}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Amendment already submitted</strong>
              <p>{amendmentClosedMessage}</p>
            </div>
          </div>
        </div>
        <Toast {...toastState} />
      </>
    );
  }

  const docEntries = Object.entries(files);
  let totalSize = 0;
  let uploadedSize = 0;

  docEntries.forEach(([docId, file]) => {
    const fileSize = file.size || 0;
    const fileProgress = uploadProgress[docId] || 0;
    totalSize += fileSize;
    uploadedSize += (fileSize * fileProgress) / 100;
  });

  const overallProgress =
    totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0;

  return (
    <>
      <div className={styles.container} ref={formRef}>
        {formData.amendmentRef ? (
          <div className={`${styles.optimistic} ${styles.amendmentNotice}`}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Amendment for {formData.amendmentRef}</strong>
              <p>
                {loadingAmendment
                  ? "Loading the existing application details..."
                  : "Update the information and upload only the corrected documents requested by NMIS."}
              </p>
            </div>
          </div>
        ) : null}
        <FormProgress
          currentStep={step}
          onStepChange={(targetStep) => goToStep(targetStep)}
          isStepEnabled={canVisitStep}
          disabled={submitting || loadingAmendment || validatingGhp}
        />

        {optimisticMessage && (
          <div
            className={styles.optimistic}
            role="status"
            aria-live="polite"
            ref={optimisticRef}>
            <span className={styles.optimisticSpinner} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Submitting your application</strong>
              <p>{optimisticMessage}</p>
              {totalSize > 0 && (
                <div className={styles.progressBarWrap}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${overallProgress}%` }}
                  />
                  <span className={styles.progressLabel}>
                    {overallProgress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <Step1Applicant
            data={formData}
            onChange={updateField}
            onNext={() => goToStep(2, true)}
            validatingGhp={validatingGhp}
            lockApplicationType={Boolean(formData.amendmentRef)}
          />
        )}
        {step === 2 && (
          <Step2Vehicle
            data={formData}
            onChange={updateField}
            onBack={() => goToStep(1)}
            onNext={() => goToStep(3, true)}
            establishmentTypes={establishmentTypes}
            establishmentNames={establishmentNames}
            loadingEstablishmentTypes={loadingEstablishmentTypes}
            loadingEstablishmentNames={loadingEstablishmentNames}
            lockPlate={renewalPlateLocked}
          />
        )}
        {step === 3 && (
          <Step3Documents
            files={files}
            setFiles={setFiles}
            agree={agree}
            setAgree={setAgree}
            onBack={() => goToStep(2)}
            onNext={() => goToStep(4, true)}
            showToast={showToast}
            isAmendment={Boolean(formData.amendmentRef)}
          />
        )}
        {step === 4 && (
          <Step4Review
            data={formData}
            originalData={originalAmendmentData}
            files={files}
            submitting={submitting}
            onBack={() => goToStep(3)}
            onSubmit={handleSubmit}
            isAmendment={Boolean(formData.amendmentRef)}
          />
        )}
      </div>
      {renewalModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !renewalLookupLoading) {
              closeRenewalModal({ resetType: true });
            }
          }}>
          <form
            className={styles.renewalModal}
            onSubmit={lookupRenewalRecord}
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-lookup-title">
            <span className={styles.modalKicker}>Renewal</span>
            <h2 id="renewal-lookup-title">Find Previous MTV Record</h2>
            <p>
              Enter the plate number of the accredited MTV. If the record is
              eligible for renewal, the form will be filled with the previous
              application details.
            </p>
            <label htmlFor="renewal-plate">
              Plate Number
              <input
                id="renewal-plate"
                type="text"
                value={renewalPlate}
                autoFocus
                placeholder="ABC 1234"
                maxLength="20"
                disabled={renewalLookupLoading}
                onChange={(event) => {
                  const value = event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9\s-]/g, "");
                  setRenewalPlate(value);
                  setRenewalLookupError("");
                }}
              />
            </label>
            {renewalLookupError ? (
              <div className={styles.modalError} role="alert">
                {renewalLookupError}
              </div>
            ) : null}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondary}
                disabled={renewalLookupLoading}
                onClick={() => closeRenewalModal({ resetType: true })}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalPrimary}
                disabled={renewalLookupLoading}>
                {renewalLookupLoading ? "Checking..." : "Find Record"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <Toast {...toastState} />
    </>
  );
}
