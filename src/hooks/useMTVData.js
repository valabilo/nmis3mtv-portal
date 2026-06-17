'use client'

import { useEffect, useState } from 'react'
import { accreditedStatusForRow } from '@/lib/accreditedStatus'

const ENDPOINTS = {
  accredited: '/api/accredited',
  banned: '/api/banned',
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key]
  }

  return ''
}

function normalizeRecord(row, type) {
  if (type === 'banned') {
    return {
      ...row,
      plate: firstValue(row, ['plate', 'plate_no', 'plate_number']),
      business: firstValue(row, ['business', 'business_name', 'bname']),
      owner: firstValue(row, ['owner', 'applicant', 'name', 'operator', 'proprietor']),
      reason: firstValue(row, ['reason', 'violation', 'remarks']),
      date: firstValue(row, ['date', 'date_banned', 'banned_date', 'timestamp']),
      status: firstValue(row, ['status']) || 'Banned',
    }
  }

  return {
    ...row,
    reference: firstValue(row, ['ref_number', 'reference', 'registration_no']),
    plate: firstValue(row, ['plate', 'plate_no', 'plate_number']),
    business: firstValue(row, ['business', 'business_name', 'bname', 'establishment_name']),
    type: firstValue(row, ['establishment_type', 'business_type', 'type', 'vehicle_type', 'vtype']),
    owner: firstValue(row, ['owner', 'applicant', 'name', 'name_of_owner', 'operator', 'proprietor']),
    address: firstValue(row, ['address']),
    telNo: firstValue(row, ['tel_no', 'telephone_no', 'contact', 'phone']),
    dateIssued: firstValue(row, ['date_issued', 'approved_at', 'issued_at']),
    stickerNo: firstValue(row, ['sticker_no', 'sticker_number']),
    receiptDate: firstValue(row, ['receipt_date', 'or_date']),
    receiptNo: firstValue(row, ['receipt_no', 'receipt_number', 'or_number']),
    remarks: firstValue(row, ['remarks', 'status']),
    expiry: firstValue(row, ['expiry', 'expiry_date', 'expiration_date', 'valid_until', 'validity', 'valid']),
    status: accreditedStatusForRow(row),
  }
}

export function useMTVData(type = 'accredited') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const endpoint = ENDPOINTS[type]
    const controller = new AbortController()

    if (!endpoint) {
      setData([])
      setError(`Unknown MTV data type: ${type}`)
      setLoading(false)
      return undefined
    }

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const json = await response.json()

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Failed to load MTV records')
        }

        setData((json.data || []).map(row => normalizeRecord(row, type)))
      } catch (err) {
        if (err.name === 'AbortError') return

        setData([])
        setError(err.message || 'Failed to load MTV records')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadData()

    return () => controller.abort()
  }, [type])

  return { data, loading, error }
}

export default useMTVData
