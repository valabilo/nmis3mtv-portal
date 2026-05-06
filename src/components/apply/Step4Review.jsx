'use client'
/**
 * components/apply/Step4Review.jsx
 */

import { REQUIRED_DOCS } from '@/data/requiredDocs'
import styles from './FormSteps.module.css'
import rStyles from './Step4Review.module.css'

function getDocName(doc) {
  return (doc.label || doc.name || '').split('(')[0].trim()
}

function ReviewRow({ label, value }) {
  return (
    <div className={rStyles.row}>
      <span className={rStyles.rowLabel}>{label}</span>
      <span className={rStyles.rowValue}>{value || '-'}</span>
    </div>
  )
}

export default function Step4Review({ data, files, submitting, onBack, onSubmit }) {
  return (
    <div className={styles.body}>
      <h2 className={styles.sectionTitle}>Review Your Application</h2>

      <div className={rStyles.grid}>
        <div className={rStyles.block}>
          <h3 className={rStyles.blockTitle}>Applicant</h3>
          <ReviewRow label="Registered Owner" value={data.registeredOwner} />
          <ReviewRow label="Email" value={data.email} />
          <ReviewRow label="Contact" value={data.contact} />
          <ReviewRow label="Address" value={data.address} />
          <ReviewRow label="Province" value={data.province} />
          <ReviewRow label="GHP Cert No. (optional)" value={data.ghpCertNumber} />
        </div>

        <div className={rStyles.block}>
          <h3 className={rStyles.blockTitle}>Application and Vehicle</h3>
          <ReviewRow label="Application Type" value={data.applicationType} />
          <ReviewRow label="Plate No." value={data.plate} />
          <ReviewRow label="Type" value={data.vtype} />
          <ReviewRow label="Make / Model" value={`${data.vmake} ${data.vmodel} (${data.vyear})`} />
          <ReviewRow label="Engine / Chassis" value={`${data.vengine || '-'} / ${data.vchassis || '-'}`} />
          <ReviewRow label="Capacity" value={data.capacity ? `${data.capacity} kg` : ''} />
        </div>

        <div className={rStyles.block}>
          <h3 className={rStyles.blockTitle}>Business Information</h3>
          <ReviewRow label="Accredited Meat Establishment to be served" value={data.meatEstablishment} />
          <ReviewRow label="Destination (major markets to be served)" value={data.intendedRoute} />
        </div>
      </div>

      <div className={rStyles.docsBlock}>
        <h3 className={rStyles.blockTitle}>Documents</h3>
        <div className={rStyles.docTags}>
          {REQUIRED_DOCS.map(doc => {
            const docName = getDocName(doc)

            return (
              <span
                key={doc.id}
                className={`tag ${files[doc.id] ? 'tag-active' : 'tag-pending'}`}
              >
                {files[doc.id] ? 'Attached' : doc.required ? 'Missing' : 'Optional'}: {docName}
              </span>
            )
          })}
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginTop: 10 }}>
          All attached documents will be saved to the NMIS Google Drive folder.
        </p>
      </div>

      <div className="form-footer">
        <button className="btn btn-outline" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}
