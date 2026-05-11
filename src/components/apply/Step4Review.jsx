"use client";
/**
 * components/apply/Step4Review.jsx
 */

import { REQUIRED_DOCS } from "@/data/requiredDocs";
import styles from "./FormSteps.module.css";
import rStyles from "./Step4Review.module.css";

function getDocName(doc) {
  return (doc.label || doc.name || "").split("(")[0].trim();
}

function valueOrBlank(value) {
  return String(value || "").trim();
}

function LineField({ label, value, wide = false }) {
  return (
    <div className={`${rStyles.lineField} ${wide ? rStyles.wideField : ""}`}>
      <span>{label}</span>
      <strong>{valueOrBlank(value)}</strong>
    </div>
  );
}

function InlineLine({ label, value }) {
  return (
    <div className={rStyles.inlineLine}>
      <span>{label}</span>
      <strong>{valueOrBlank(value)}</strong>
    </div>
  );
}

function CheckboxLine({ label, checked }) {
  return (
    <span className={rStyles.checkboxLine}>
      <span className={checked ? rStyles.checkboxChecked : rStyles.checkbox} />
      {label}
    </span>
  );
}

const AMENDMENT_FIELDS = [
  ["Application Type", "applicationType"],
  ["Registered Owner", "registeredOwner"],
  ["Email", "email"],
  ["Contact", "contact"],
  ["Address", "address"],
  ["Region", "region"],
  ["Province", "province"],
  ["GHP Cert No.", "ghpCertNumber"],
  ["Plate No.", "plate"],
  ["Vehicle Type", "vtype"],
  ["Make / Brand", "vmake"],
  ["Model", "vmodel"],
  ["Year Model", "vyear"],
  ["Color", "vcolor"],
  ["Engine Number", "vengine"],
  ["Chassis Number", "vchassis"],
  ["CR Number", "crNumber"],
  ["OR Number", "orNumber"],
  ["Cooling Capacity", "cooling"],
  ["Load Capacity", "capacity"],
  ["Compartment Material", "material"],
  ["Business Type", "btype"],
  ["Accredited Meat Establishment to be served", "meatEstablishment"],
  ["Destination (major markets to be served)", "intendedRoute"],
];

function normalizeCompare(value) {
  return valueOrBlank(value).replace(/\s+/g, " ");
}

function AmendmentChange({ label, before, after }) {
  return (
    <article className={rStyles.changeItem}>
      <h3>{label}</h3>
      <div className={rStyles.changeRows}>
        <div>
          <span>From</span>
          <strong>{valueOrBlank(before) || "-"}</strong>
        </div>
        <div>
          <span>To</span>
          <strong>{valueOrBlank(after) || "-"}</strong>
        </div>
      </div>
    </article>
  );
}

export default function Step4Review({
  data,
  originalData,
  files,
  submitting,
  onBack,
  onSubmit,
  isAmendment = false,
}) {
  const applicationType = valueOrBlank(data.applicationType).toLowerCase();
  const isNew = applicationType === "new" && !isAmendment;
  const isRenewal = !isNew;
  const changedFields =
    isAmendment && originalData
      ? AMENDMENT_FIELDS.filter(([, key]) => {
          if (key === "applicationType") return false;
          return normalizeCompare(originalData[key]) !== normalizeCompare(data[key]);
        })
      : [];
  const uploadedDocs = REQUIRED_DOCS.filter((doc) => Boolean(files?.[doc.id]));

  if (isAmendment) {
    return (
      <div className={styles.body}>
        <h2 className={styles.sectionTitle}>Review Your Amendment</h2>

        <section className={rStyles.amendmentPanel}>
          <div className={rStyles.amendmentHeader}>
            <span>Reference Number</span>
            <strong>{valueOrBlank(data.amendmentRef) || valueOrBlank(data.reference)}</strong>
          </div>

          <div className={rStyles.changesBlock}>
            <h3>Modified Information</h3>
            {changedFields.length ? (
              <div className={rStyles.changeList}>
                {changedFields.map(([label, key]) => (
                  <AmendmentChange
                    key={key}
                    label={label}
                    before={originalData?.[key]}
                    after={data[key]}
                  />
                ))}
              </div>
            ) : (
              <p className={rStyles.emptyChanges}>
                No information fields were changed.
              </p>
            )}
          </div>

          <div className={rStyles.changesBlock}>
            <h3>Modified Documents</h3>
            {uploadedDocs.length ? (
              <div className={rStyles.docTags}>
                {uploadedDocs.map((doc) => (
                  <span key={doc.id} className="tag tag-active">
                    Updated: {getDocName(doc)}
                  </span>
                ))}
              </div>
            ) : (
              <p className={rStyles.emptyChanges}>
                No replacement documents were uploaded.
              </p>
            )}
          </div>
        </section>

        <div className="form-footer">
          <button className="btn btn-outline" onClick={onBack} disabled={submitting}>
            Back
          </button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Amendment"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <h2 className={styles.sectionTitle}>
        {isAmendment ? "Review Your Amendment" : "Review Your Application"}
      </h2>

      <section className={rStyles.paper} aria-label="Filled MTV application preview">
        <div className={rStyles.watermark} aria-hidden="true" />

        <header className={rStyles.formHeader}>
          <h3>
            APPLICATION FOR THE ISSUANCE OF CERTIFICATE OF ACCREDITATION TO
            <span>MEAT TRANSPORT VEHICLES</span>
          </h3>
        </header>

        <div className={rStyles.rule} />

        <div className={rStyles.typeBlock}>
          <span>Type of Application</span>
          <div>
            <CheckboxLine label="New" checked={isNew} />
            <CheckboxLine label="Renewal" checked={isRenewal} />
          </div>
        </div>

        <div className={rStyles.fieldStack}>
          <LineField label="Registered Owner:" value={data.registeredOwner} wide />
          <LineField label="Address:" value={data.address} wide />
          <LineField label="e-mail address:" value={data.email} wide />
          <div className={rStyles.twoColumn}>
            <LineField label="Telephone number:" value={data.contact} />
            <LineField label="Fax number:" value="" />
          </div>
        </div>

        <div className={rStyles.rule} />

        <div className={rStyles.sectionGroup}>
          <h4>Vehicle Identification</h4>
          <LineField label="Make:" value={data.vmake} wide />
          <LineField label="Plate number:" value={data.plate} wide />
          <LineField label="Engine Number:" value={data.vengine} wide />
          <LineField
            label="LTO Certificate of Registration Number:"
            value={data.crNumber}
            wide
          />
          <LineField
            label="LTO Official Receipt of Registration:"
            value={data.orNumber}
            wide
          />
        </div>

        <div className={rStyles.rule} />

        <div className={rStyles.fieldStack}>
          <LineField
            label="Accredited Meat Establishments to be served:"
            value={data.meatEstablishment}
            wide
          />
          <LineField
            label="Destination (major markets to be served):"
            value={data.intendedRoute}
            wide
          />
        </div>

        <div className={rStyles.rule} />

        <div className={rStyles.certification}>
          <p>
            All data collected is used for legitimate purpose of the stated form and
            adheres with the compliance to the Data Privacy Act of 2012
          </p>
          <p>
            I hereby certify that the above statement are true and correct to the
            best of my knowledge and the documentary requirements are complete.
          </p>
          <div className={rStyles.applicantSign}>
            <strong>{valueOrBlank(data.registeredOwner)}</strong>
            <span>Applicant</span>
            <small>(Signature over printed name)</small>
          </div>
        </div>

        <div className={rStyles.rule} />

        <div className={rStyles.nmisSection}>
          <p>(This portion to be filled out by NMIS authorized representative)</p>
          <div className={rStyles.twoColumn}>
            <InlineLine label="Date of Application:" value="" />
            <InlineLine label="Date of Release:" value="" />
          </div>
          <div className={rStyles.nmisSignature}>
            <strong />
            <span>NMIS authorized representative</span>
            <small>(Signature over printed name)</small>
          </div>
        </div>

        <div className={rStyles.copyCut} />

        <div className={rStyles.applicantCopy}>
          <div className={rStyles.twoColumn}>
            <p>(Applicant's Copy)</p>
            <InlineLine label="Control No:" value="" />
          </div>
          <div className={rStyles.twoColumn}>
            <InlineLine label="Date of Application:" value="" />
            <InlineLine label="Date of Release:" value="" />
          </div>
          <div className={rStyles.copySignature}>
            <strong>{valueOrBlank(data.registeredOwner)}</strong>
            <span>Applicant</span>
            <small>(Signature over printed name)</small>
          </div>
        </div>
      </section>

      <div className={rStyles.docsBlock}>
        <h3 className={rStyles.docsTitle}>Documents Uploaded</h3>
        <div className={rStyles.docTags}>
          {REQUIRED_DOCS.map((doc) => {
            const docName = getDocName(doc);
            const attached = Boolean(files?.[doc.id]);

            return (
              <span
                key={doc.id}
                className={`tag ${attached ? "tag-active" : "tag-pending"}`}>
                {attached
                  ? "Attached"
                  : doc.required && !isAmendment
                    ? "Missing"
                    : "Optional"}
                : {docName}
              </span>
            );
          })}
        </div>
      </div>

      <div className="form-footer">
        <button className="btn btn-outline" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting
            ? "Submitting..."
            : isAmendment
              ? "Submit Amendment"
              : "Submit Application"}
        </button>
      </div>
    </div>
  );
}
