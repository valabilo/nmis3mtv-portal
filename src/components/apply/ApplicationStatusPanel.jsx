'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import StatusTag from '@/components/ui/StatusTag'
import { ACCEPTED_FILE_TYPES, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { formatBytes } from '@/lib/utils'
import styles from './ApplicationStatusPanel.module.css'

const CHUNK_SIZE = 4 * 1024 * 1024
const PAYMENT_UPLOAD_STATUSES = ['For Payment', 'Rejected Proof of Payment']
const PAYMENT_LOCKED_STATUSES = ['For Payment Verification', 'Payment Verified']

function Detail({ label, value }) {
  return (
    <div className={styles.detail}>
      <label>{label}</label>
      <p>{value || '-'}</p>
    </div>
  )
}

async function initUpload({ fileName, mimeType, folderId, fileSize }) {
  const res = await fetch('/api/drive/init-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, mimeType, folderId, fileSize }),
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || 'Failed to initialize proof upload.')
  return json.uploadUrl
}

async function uploadChunk({ uploadUrl, chunk, rangeStart, rangeEnd, totalSize, isLast }) {
  const form = new FormData()
  form.append('uploadUrl', uploadUrl)
  form.append('chunk', chunk)
  form.append('rangeStart', String(rangeStart))
  form.append('rangeEnd', String(rangeEnd))
  form.append('totalSize', String(totalSize))
  form.append('isLast', isLast ? 'true' : 'false')

  const res = await fetch('/api/drive/upload-chunk', {
    method: 'POST',
    body: form,
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || 'Proof upload failed.')
  return json
}

async function uploadProofFile({ file, refNumber, folderId, onProgress }) {
  const safeName = `${refNumber}_proof_of_payment_${file.name}`.replace(/[^\w.\- ]+/g, '_')
  const uploadUrl = await initUpload({
    fileName: safeName,
    mimeType: file.type || 'application/octet-stream',
    folderId,
    fileSize: file.size,
  })

  let fileId = null
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, file.size) - 1
    const result = await uploadChunk({
      uploadUrl,
      chunk: file.slice(offset, end + 1),
      rangeStart: offset,
      rangeEnd: end,
      totalSize: file.size,
      isLast: end + 1 >= file.size,
    })
    if (result.done) fileId = result.fileId
    onProgress?.(Math.round(((end + 1) / file.size) * 100))
  }

  if (!fileId) throw new Error('Proof upload did not return a Drive file ID.')
  return { fileId, fileName: safeName }
}

export default function ApplicationStatusPanel() {
  const searchParams = useSearchParams()
  const initialRef = searchParams.get('ref') ?? ''
  const [ref, setRef] = useState(initialRef)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [application, setApplication] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofProgress, setProofProgress] = useState(0)
  const proofInputRef = useRef(null)

  async function checkStatus(value = ref) {
    const query = value.trim()

    if (!query) {
      setError('Please enter your application reference number.')
      setApplication(null)
      return
    }

    setLoading(true)
    setError('')
    setApplication(null)

    try {
      const response = await fetch(`/api/applications/status?ref=${encodeURIComponent(query)}`, {
        cache: 'no-store',
      })
      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Unable to check application status.')
      }

      setApplication(json.application)
      setPaymentReference(json.application.paymentReference || '')
      setProofFile(null)
      setProofProgress(0)
      setPaymentMessage('')
      setPaymentError('')
    } catch (err) {
      setError(err.message || 'Unable to check application status.')
    } finally {
      setLoading(false)
    }
  }

  async function submitPaymentReference(event) {
    event.preventDefault()

    const query = application?.reference || ref.trim()
    const value = paymentReference.trim()

    if (!query || !value) {
      setPaymentError('Enter your payment reference number.')
      return
    }

    if (!proofFile) {
      setPaymentError('Upload your proof of payment.')
      return
    }

    if (!application?.folderId) {
      setPaymentError('Application folder is unavailable. Please contact NMIS.')
      return
    }

    setPaymentSaving(true)
    setPaymentError('')
    setPaymentMessage('')
    setProofProgress(0)

    try {
      const uploadedProof = await uploadProofFile({
        file: proofFile,
        refNumber: query,
        folderId: application.folderId,
        onProgress: setProofProgress,
      })
      const response = await fetch('/api/applications/payment-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: query,
          paymentReference: value,
          proofFileId: uploadedProof.fileId,
          proofFileName: uploadedProof.fileName,
        }),
      })
      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Unable to submit proof of payment.')
      }

      setPaymentReference(json.paymentReference || value)
      setPaymentMessage(json.message || 'Proof of payment submitted for NMIS verification.')
      setProofFile(null)
      if (proofInputRef.current) proofInputRef.current.value = ''
      setApplication(current =>
        current
          ? {
              ...current,
              status: json.status || 'For Payment Verification',
              paymentReference: json.paymentReference || value,
              proofOfPaymentFileName: json.proofFileName || uploadedProof.fileName,
              orderOfPaymentUrl: '',
            }
          : current,
      )
    } catch (err) {
      setPaymentError(err.message || 'Unable to submit proof of payment.')
    } finally {
      setPaymentSaving(false)
    }
  }

  function chooseProofFile(event) {
    const file = event.target.files?.[0]
    setPaymentError('')
    setPaymentMessage('')
    setProofProgress(0)

    if (!file) {
      setProofFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setProofFile(null)
      if (event.target) event.target.value = ''
      setPaymentError('Proof of payment must be 5 MB or smaller.')
      return
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setProofFile(null)
      if (event.target) event.target.value = ''
      setPaymentError('Upload proof as PDF, JPG, JPEG, or PNG only.')
      return
    }

    setProofFile(file)
  }

  function removeProofFile() {
    setProofFile(null)
    setProofProgress(0)
    if (proofInputRef.current) proofInputRef.current.value = ''
  }

  function handleProofDrop(event) {
    event.preventDefault()
    if (paymentSaving || PAYMENT_LOCKED_STATUSES.includes(application?.status)) return

    const file = event.dataTransfer.files?.[0]
    if (!file) return

    chooseProofFile({ target: { files: [file] } })
  }

  useEffect(() => {
    if (initialRef) checkStatus(initialRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef])

  return (
    <section className={styles.section} id="application-status">
      <div className={styles.header}>
        <span>Application Tracking</span>
        <h2>Check Application Status</h2>
        <p>Enter the reference number issued after submitting your MTV application.</p>
      </div>

      <div className={styles.searchCard}>
        <div className={styles.searchRow}>
          <input
            type="text"
            value={ref}
            onChange={event => setRef(event.target.value.toUpperCase())}
            onKeyDown={event => event.key === 'Enter' && checkStatus()}
            placeholder="e.g. MTV-2026-12345"
            aria-label="Application reference number"
          />
          <button className="btn btn-primary" onClick={() => checkStatus()} disabled={loading}>
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.message}>
          <strong>Status unavailable</strong>
          <p>{error}</p>
        </div>
      )}

      {application && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div>
              <span>Reference Number</span>
              <h3>{application.reference}</h3>
            </div>
            <StatusTag status={application.status} />
          </div>

          <div className={styles.resultBody}>
            <div className={styles.grid}>
              <Detail label="Applicant" value={application.applicant} />
              <Detail label="Business Name" value={application.business} />
              <Detail label="Plate Number" value={application.plate} />
              <Detail label="Vehicle Type" value={application.vehicleType} />
              <Detail label="Email" value={application.email} />
              <Detail label="Contact Number" value={application.contact} />
              <Detail label="Submitted" value={application.submittedAt} />
              <Detail label="Current Status" value={application.status} />
            </div>

            <div className={styles.remarks}>
              <strong>Remarks</strong>
              <p>{application.remarks || 'No remarks have been added yet.'}</p>
            </div>

            {application.orderOfPaymentUrl ? (
              <div className={styles.downloadCard}>
                <div>
                  <strong>Order of Payment</strong>
                  <p>Download your Order of Payment PDF and online payment steps.</p>
                </div>
                <a
                  href={application.orderOfPaymentUrl}
                  className={styles.downloadButton}
                  download>
                  Download
                </a>
              </div>
            ) : null}

            {PAYMENT_UPLOAD_STATUSES.includes(application.status) || PAYMENT_LOCKED_STATUSES.includes(application.status) ? (
              <form className={styles.paymentCard} onSubmit={submitPaymentReference}>
                <div>
                  <strong>Proof of Payment</strong>
                  <p>
                    Already paid? Enter the Landbank/payment reference number and upload your payment confirmation.
                  </p>
                </div>
                <div className={styles.paymentForm}>
                  <label className={styles.paymentField}>
                    <span>Payment Reference Number</span>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={event => setPaymentReference(event.target.value.toUpperCase())}
                      placeholder="e.g. LBP-123456789"
                      disabled={paymentSaving || PAYMENT_LOCKED_STATUSES.includes(application.status)}
                      aria-label="Payment reference number"
                    />
                  </label>
                  <div className={styles.paymentField}>
                    <span>Proof of Payment</span>
                    {!proofFile ? (
                      <div
                        className={styles.dropZone}
                        onClick={() => proofInputRef.current?.click()}
                        onDragOver={event => {
                          event.preventDefault()
                          event.currentTarget.classList.add(styles.dragOver)
                        }}
                        onDragLeave={event => event.currentTarget.classList.remove(styles.dragOver)}
                        onDrop={event => {
                          event.currentTarget.classList.remove(styles.dragOver)
                          handleProofDrop(event)
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Upload proof of payment"
                        onKeyDown={event => event.key === 'Enter' && proofInputRef.current?.click()}
                      >
                        <span className={styles.dropIcon}>Upload</span>
                        <p>Click to upload or drag and drop</p>
                        <p className={styles.dropHint}>PDF, JPG, PNG - max 5 MB</p>
                      </div>
                    ) : (
                      <div className={styles.fileItem}>
                        <span>{proofFile.name} ({formatBytes(proofFile.size)})</span>
                        <button
                          type="button"
                          onClick={removeProofFile}
                          className={styles.removeBtn}
                          disabled={paymentSaving}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={chooseProofFile}
                    disabled={paymentSaving || PAYMENT_LOCKED_STATUSES.includes(application.status)}
                    aria-label="Proof of payment"
                    className={styles.hiddenFile}
                  />
                  <button
                    className={styles.downloadButton}
                    type="submit"
                    disabled={paymentSaving || PAYMENT_LOCKED_STATUSES.includes(application.status)}>
                    {paymentSaving ? 'Submitting...' : PAYMENT_LOCKED_STATUSES.includes(application.status) ? 'Submitted' : 'Submit Proof'}
                  </button>
                </div>
                {application.proofOfPaymentFileName && !proofFile ? (
                  <p className={styles.paymentMeta}>Submitted file: {application.proofOfPaymentFileName}</p>
                ) : null}
                {paymentSaving && proofProgress > 0 ? (
                  <p className={styles.paymentMeta}>Uploading proof: {proofProgress}%</p>
                ) : null}
                {paymentMessage ? <p className={styles.paymentSuccess}>{paymentMessage}</p> : null}
                {paymentError ? <p className={styles.paymentError}>{paymentError}</p> : null}
              </form>
            ) : null}
          </div>
        </div>
      )}

      <div className={styles.footerAction}>
        <Link href="/apply" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Back to MTV Application
        </Link>
      </div>
    </section>
  )
}
