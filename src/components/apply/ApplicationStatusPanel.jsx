'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import StatusTag from '@/components/ui/StatusTag'
import styles from './ApplicationStatusPanel.module.css'

function Detail({ label, value }) {
  return (
    <div className={styles.detail}>
      <label>{label}</label>
      <p>{value || '-'}</p>
    </div>
  )
}

export default function ApplicationStatusPanel() {
  const searchParams = useSearchParams()
  const initialRef = searchParams.get('ref') ?? ''
  const [ref, setRef] = useState(initialRef)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [application, setApplication] = useState(null)

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
    } catch (err) {
      setError(err.message || 'Unable to check application status.')
    } finally {
      setLoading(false)
    }
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
