import { readSheet } from './googleSheets'

function getDriveFileId(value) {
  if (!value) return ''

  const text = String(value).trim()
  const filePathMatch = text.match(/\/file\/d\/([^/]+)/)
  if (filePathMatch?.[1]) return filePathMatch[1]

  try {
    const url = new URL(text)
    return url.searchParams.get('id') || ''
  } catch {
    return text.includes('/') ? '' : text
  }
}

function toDownloadUrl(row) {
  const fileId = getDriveFileId(row.file_id || row.drive_file_id || row.google_drive_file_id)
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`

  const url = row.url || row.link || row.file_url || row.drive_url || ''
  const urlFileId = getDriveFileId(url)
  if (urlFileId) return `https://drive.google.com/uc?export=download&id=${urlFileId}`

  return url
}

export async function getDownloadables() {
  try {
    const rows = await readSheet('Downloadables')
    const items = rows
      .filter((row) => String(row.active || 'yes').trim().toLowerCase() !== 'no')
      .map((row, index) => ({
        title: row.title || row.name || '',
        description: row.description || row.details || '',
        href: toDownloadUrl(row),
        type: (row.type || row.file_type || 'PDF').toUpperCase(),
        order: Number(row.order || row.sort_order || index + 1),
      }))
      .filter((item) => item.title && item.href)
      .sort((a, b) => a.order - b.order)

    return items
  } catch {
    return []
  }
}
