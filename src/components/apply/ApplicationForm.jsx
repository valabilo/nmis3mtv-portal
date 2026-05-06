"use client";
/**
 * components/apply/ApplicationForm.jsx
 *
 * Orchestrates the 4-step MTV application form.
 * Documents are converted to base64 and uploaded to Google Drive
 * via the /api/applications endpoint.
 *
 * GHP orientation is completely separate — users do NOT need to
 * complete GHP before applying here.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
};

const DRAFT_STORAGE_KEY = "mtv-application-draft-v1";

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
    // Ignore storage failures so form submission/reset still completes.
  }
}

export default function ApplicationForm() {
  const formRef = useRef(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [files, setFiles] = useState({}); // { docId: File }
  const [agree, setAgree] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validatingGhp, setValidatingGhp] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [, startTransition] = useTransition();

  const { toastState, showToast } = useToast();
  const submissionId = useMemo(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    [],
  );

  useEffect(() => {
    const draft = getSavedDraft();
    if (draft) {
      setFormData(draft.formData);
      setStep(draft.step);
      setAgree(draft.agree);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || submitted) return;

    const saveTimer = window.setTimeout(() => {
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
        // The form remains usable even if browser storage is unavailable.
      }
    }, 250);

    return () => window.clearTimeout(saveTimer);
  }, [agree, draftReady, formData, step, submitted]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== DRAFT_STORAGE_KEY || !event.newValue) return;
      const draft = getSavedDraft();
      if (!draft) return;

      setFormData(draft.formData);
      setStep(draft.step);
      setAgree(draft.agree);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function goToStep(target, validate = false) {
    if (validate && !runValidation(step)) return;
    if (validate && step === 1) {
      const validGhp = await validateOptionalGhpControlNo();
      if (!validGhp) return;
    }
    setStep(target);
    requestAnimationFrame(() => {
      const formTop =
        formRef.current?.getBoundingClientRect().top + window.scrollY;
      if (!formTop) return;

      window.scrollTo({
        top: Math.max(formTop - 130, 0),
        behavior: "smooth",
      });
    });
  }

  function runValidation(currentStep) {
    const requiredByStep = {
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
        "capacity",
        "meatEstablishment",
        "intendedRoute",
      ],
      3: [],
    };
    const fieldLabels = {
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
      capacity: "Load Capacity",
      meatEstablishment: "Meat Establishment",
      intendedRoute: "Intended Route",
    };

    const missing = (requiredByStep[currentStep] || []).filter(
      (k) => !formData[k]?.trim(),
    );
    if (missing.length) {
      const missingLabels = missing
        .map((key) => fieldLabels[key] || key)
        .join(", ");
      showToast(`Please fill in required fields: ${missingLabels}.`, true);
      return false;
    }
    if (currentStep === 3) {
      const missingDocs = REQUIRED_DOCS.filter(
        (doc) => doc.required && !files[doc.id],
      );
      if (missingDocs.length) {
        showToast("Please upload all required documents.", true);
        return false;
      }
    }
    if (currentStep === 3 && !agree) {
      showToast("Please agree to the certification.", true);
      return false;
    }
    return true;
  }

  async function validateOptionalGhpControlNo() {
    const controlNo = formData.ghpCertNumber?.trim();
    if (!controlNo) return true;

    setValidatingGhp(true);
    try {
      const res = await fetch(
        `/api/ghp/certificate?id=${encodeURIComponent(controlNo)}`,
        {
          cache: "no-store",
        },
      );
      const json = await res.json();

      if (!res.ok || !json.success || json.certificate?.isExpired) {
        showToast(
          "The GHP certificate control number is not valid. Leave it blank or enter a valid control number.",
          true,
        );
        return false;
      }

      return true;
    } catch {
      showToast(
        "Unable to validate the GHP certificate control number. Please try again or leave it blank.",
        true,
      );
      return false;
    } finally {
      setValidatingGhp(false);
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    const validGhp = await validateOptionalGhpControlNo();
    if (!validGhp) return;
    setSubmitting(true);
    startTransition(() =>
      setOptimisticMessage(
        "Securing your application and uploading documents...",
      ),
    );
    try {
      const payload = new FormData();
      payload.append("submissionId", submissionId);
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value ?? "");
      });
      Object.entries(files).forEach(([docId, file]) => {
        payload.append(`document:${docId}`, file, file.name);
      });

      const res = await fetch("/api/applications", {
        method: "POST",
        body: payload,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (!json.emailSent) {
        showToast(
          "Application submitted, but the confirmation email could not be sent. Please keep your reference number.",
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
    }
  }

  function handleReset() {
    setStep(1);
    setFormData(INITIAL_FORM);
    setFiles({});
    setAgree(false);
    setSubmitted(false);
    setRefNumber("");
    clearSavedDraft();
  }

  if (submitted) {
    return <SuccessView refNumber={refNumber} onReset={handleReset} />;
  }

  return (
    <>
      <div className={styles.container} ref={formRef}>
        <FormProgress currentStep={step} />
        {optimisticMessage && (
          <div className={styles.optimistic} role="status" aria-live="polite">
            <span className={styles.optimisticSpinner} />
            <div>
              <strong>Application is being submitted</strong>
              <p>{optimisticMessage}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <Step1Applicant
            data={formData}
            onChange={updateField}
            onNext={() => goToStep(2, true)}
            validatingGhp={validatingGhp}
          />
        )}
        {step === 2 && (
          <Step2Vehicle
            data={formData}
            onChange={updateField}
            onBack={() => goToStep(1)}
            onNext={() => goToStep(3, true)}
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
          />
        )}
        {step === 4 && (
          <Step4Review
            data={formData}
            files={files}
            submitting={submitting}
            onBack={() => goToStep(3)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
      <Toast {...toastState} />
    </>
  );
}
