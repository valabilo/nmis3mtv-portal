/**
 * components/ui/StatusTag.jsx
 *
 * Renders a coloured pill badge for an MTV status value.
 *
 * Props:
 *   status {string}  e.g. 'Active', 'Expired', 'Banned'
 */

const CLASS_MAP = {
  Active:    'tag-active',
  Completed: 'tag-active',
  Expired:   'tag-expired',
  'Application Received': 'tag-pending',
  'Under Review': 'tag-pending',
  'For Payment': 'tag-pending',
  'For Payment Verification': 'tag-pending',
  'Payment Verified': 'tag-active',
  Banned:    'tag-banned',
  Suspended: 'tag-banned',
  Revoked:   'tag-banned',
  'Rejected Application': 'tag-banned',
  'Rejected Proof of Payment': 'tag-banned',
}

export default function StatusTag({ status }) {
  const cls = CLASS_MAP[status] ?? 'tag-pending'
  return (
    <span className={`tag ${cls}`}>
      {status}
    </span>
  )
}
