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
  Approved:  'tag-active',
  Released:  'tag-active',
  Completed: 'tag-active',
  Expired:   'tag-expired',
  Pending:   'tag-pending',
  'For Review': 'tag-pending',
  'Under Review': 'tag-pending',
  'For Inspection': 'tag-pending',
  Banned:    'tag-banned',
  Suspended: 'tag-banned',
  Revoked:   'tag-banned',
  Rejected:  'tag-banned',
  Denied:    'tag-banned',
}

export default function StatusTag({ status }) {
  const cls = CLASS_MAP[status] ?? 'tag-pending'
  return (
    <span className={`tag ${cls}`}>
      {status}
    </span>
  )
}
