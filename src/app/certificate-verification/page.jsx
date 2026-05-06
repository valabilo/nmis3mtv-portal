'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './certificate-verification.module.css'

function Detail({ label, value }) {
  return (
    <div className={styles.detail}>
      <label>{label}</label>
      <p>{value || '-'}</p>
    </div>
  )
}

function CertificateVerificationContent() {
  const searchParams = useSearchParams()
  const initialId = searchParams.get('id') || searchParams.get('certNumber') || ''
  const [controlNo, setControlNo] = useState(initialId)
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function verifyCertificate(value = controlNo) {
    const id = value.trim().toUpperCase()

    if (!id) {
      setCertificate(null)
      setError('Please enter a certificate control number.')
      setSearched(true)
      return
    }

    setLoading(true)
    setError('')
    setCertificate(null)
    setSearched(true)

    try {
      const response = await fetch(`/api/ghp/certificate?id=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })
      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Certificate could not be verified.')
      }

      setCertificate(json.certificate)
    } catch (err) {
      setError(err.message || 'Certificate could not be verified.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialId) verifyCertificate(initialId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  const validCertificate = certificate && !certificate.isExpired

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Certificate Verification</h1>
          <p>Verify an NMIS RTOC III GHP certificate using its control number.</p>
        </div>
      </div>

      <div className={styles.page}>
        <div className="container">
          <section className={styles.overview}>
            <div>
              <span className={styles.kicker}>Certificate Lookup</span>
              <h2>Confirm whether a GHP certificate is recorded and still valid.</h2>
              <p>
                Use the certificate control number printed on the GHP
                certificate or encoded in the QR code to verify the official
                record.
              </p>
            </div>
            <div className={styles.summaryGrid}>
              <div>
                <span>Input</span>
                <strong>Control number</strong>
              </div>
              <div>
                <span>Example</span>
                <strong>GHP-2026-987</strong>
              </div>
              <div>
                <span>Result</span>
                <strong>Valid or expired</strong>
              </div>
            </div>
          </section>

          <div className={styles.searchCard}>
            <h2>Verify Certificate</h2>
            <p>Enter the control number printed on the certificate or scan its QR code.</p>
            <div className={styles.searchRow}>
              <input
                type="text"
                value={controlNo}
                onChange={event => setControlNo(event.target.value.toUpperCase())}
                onKeyDown={event => event.key === 'Enter' && verifyCertificate()}
                placeholder="e.g. GHP-2026-987"
                aria-label="Certificate control number"
              />
              <button className="btn btn-primary" onClick={() => verifyCertificate()} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.invalidCard}>
              <div className={styles.badgeInvalid}>Not Found</div>
              <h2>Certificate could not be verified</h2>
              <p>{error}</p>
              {searched && controlNo && (
                <p className={styles.searched}>Searched for: <strong>{controlNo}</strong></p>
              )}
            </div>
          )}

          {certificate && (
            <div className={styles.resultCard}>
              <div className={validCertificate ? styles.resultHeaderValid : styles.resultHeaderExpired}>
                <div>
                  <span>{validCertificate ? 'Certificate Valid' : 'Certificate Expired'}</span>
                  <h2>{certificate.controlNo}</h2>
                </div>
                <strong>{validCertificate ? 'VALID' : 'EXPIRED'}</strong>
              </div>

              <div className={styles.resultBody}>
                <div className={styles.nameBlock}>
                  <span>Issued To</span>
                  <h3>{certificate.name || '-'}</h3>
                </div>

                <div className={styles.grid}>
                  <Detail label="Control Number" value={certificate.controlNo} />
                  <Detail label="Result" value={certificate.status} />
                  <Detail label="Score" value={certificate.score} />
                  <Detail label="Exam Date" value={certificate.examDate} />
                  <Detail label="Valid Until" value={certificate.expiryDate} />
                  <Detail label="Certificate Sent" value={certificate.certSent} />
                </div>

                <div className={validCertificate ? styles.noticeValid : styles.noticeExpired}>
                  {validCertificate
                    ? `This certificate is officially recorded and valid until ${certificate.expiryDate || 'the listed expiry date'}.`
                    : `This certificate has expired${certificate.expiryDate ? ` on ${certificate.expiryDate}` : ''}.`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function CertificateVerificationPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '80px auto' }} />}>
      <CertificateVerificationContent />
    </Suspense>
  )
}
