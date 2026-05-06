'use client'

import { useEffect, useState } from 'react'

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
    plate: firstValue(row, ['plate', 'plate_no', 'plate_number']),
    business: firstValue(row, ['business', 'business_name', 'bname']),
    type: firstValue(row, ['type', 'vehicle_type', 'vtype']),
    owner: firstValue(row, ['owner', 'applicant', 'name', 'operator', 'proprietor']),
    expiry: firstValue(row, ['expiry', 'expiry_date', 'expiration_date', 'valid_until']),
    status: firstValue(row, ['status']) || 'Active',
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
