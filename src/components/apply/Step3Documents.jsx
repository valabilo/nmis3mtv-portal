'use client'
/**
 * components/apply/Step3Documents.jsx
 */

import { REQUIRED_DOCS } from '@/data/requiredDocs'
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES, ACCEPTED_MIME_TYPES } from '@/lib/constants'
import { formatBytes } from '@/lib/utils'
import styles from './FormSteps.module.css'
import docStyles from './Step3Documents.module.css'

function getDocName(doc) {
  return doc.label || doc.name || ''
}

export default function Step3Documents({ files, setFiles, agree, setAgree, onBack, onNext, showToast }) {
  function addFile(docId, file) {
    if (file.size > MAX_FILE_SIZE) {
      showToast('File too large. Maximum size is 5 MB.', true)
      return
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      showToast('Invalid file type. Upload PDF, JPG, JPEG, or PNG only.', true)
      return
    }
    setFiles(prev => ({ ...prev, [docId]: file }))
  }

  function removeFile(docId) {
    setFiles(prev => {
      const next = { ...prev }
      delete next[docId]
      return next
    })
  }

  function handleDrop(e, docId) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) addFile(docId, file)
  }

  return (
    <div className={styles.body}>
      <h2 className={styles.sectionTitle}>Documentary Requirements</h2>
      <p className={docStyles.intro}>
        Upload scanned copies or clear photos of the required MTV registration documents.
        Accepted formats: PDF, JPG, PNG. Maximum file size per document: 5 MB.
      </p>

      <div className={docStyles.docList}>
        {REQUIRED_DOCS.map(doc => (
          <div key={doc.id} className={docStyles.docItem}>
            <label className={docStyles.docLabel}>
              {getDocName(doc)} {doc.required ? <span className="req">*</span> : <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>(optional)</span>}
            </label>
            <p className={docStyles.dropHint}>{doc.description}</p>

            {!files[doc.id] ? (
              <div
                className={docStyles.dropZone}
                onClick={() => document.getElementById(`file_${doc.id}`).click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(docStyles.dragOver) }}
                onDragLeave={e => e.currentTarget.classList.remove(docStyles.dragOver)}
                onDrop={e => { e.currentTarget.classList.remove(docStyles.dragOver); handleDrop(e, doc.id) }}
                role="button"
                tabIndex={0}
                aria-label={`Upload ${getDocName(doc)}`}
                onKeyDown={e => e.key === 'Enter' && document.getElementById(`file_${doc.id}`).click()}
              >
                <span className={docStyles.dropIcon}>Upload</span>
                <p>Click to upload or drag and drop</p>
                <p className={docStyles.dropHint}>PDF, JPG, PNG - max 5 MB</p>
              </div>
            ) : (
              <div className={docStyles.fileItem}>
                <span>{files[doc.id].name} ({formatBytes(files[doc.id].size)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(doc.id)}
                  aria-label={`Remove ${getDocName(doc)}`}
                  className={docStyles.removeBtn}
                >Remove</button>
              </div>
            )}

            <input
              type="file"
              id={`file_${doc.id}`}
              accept={ACCEPTED_FILE_TYPES}
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) addFile(doc.id, e.target.files[0]) }}
            />
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: 28 }}>Certification</h2>
      <div className={docStyles.certBox}>
        All data collected is used for legitimate purpose of the stated form and adheres with the compliance to the Data Privacy
        Act of 2012.
        <br />
        I hereby certify that the above statement are true and correct to the best of my knowledge and the documentary requirements are complete.
      </div>
      <label className={docStyles.agreeLabel}>
        <input
          type="checkbox"
          checked={agree}
          onChange={e => setAgree(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
        />
        I agree to the terms and certification above. <span className="req">*</span>
      </label>

      <div className="form-footer">
        <button className="btn btn-outline" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next: Review</button>
      </div>
    </div>
  )
}
