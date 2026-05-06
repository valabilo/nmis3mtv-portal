'use client'
/**
 * components/ui/DataTable.jsx
 *
 * Reusable paginated, searchable table.
 * Used on both the Verify and Banned pages.
 *
 * Props:
 *   title     {string}         Table heading
 *   columns   {Column[]}       Column definitions: { key, label, render? }
 *   data      {object[]}       Full dataset (unfiltered)
 *   loading   {boolean}
 *   emptyText {string}         Message when no rows match
 */

import { usePagination } from '@/hooks/usePagination'
import styles from './DataTable.module.css'

export default function DataTable({ title, columns, data, loading, emptyText = 'No records found.' }) {
  const { query, setQuery, page, setPage, rows, total, pages } = usePagination(data)

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <h3 className={styles.tableTitle}>{title}</h3>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter records..."
            aria-label="Filter table records"
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  <div className="spinner" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {Math.min(total, (page - 1) * 8 + rows.length)} of {total} records
          </span>
          {pages > 1 && (
            <div className={styles.paginationBtns}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
