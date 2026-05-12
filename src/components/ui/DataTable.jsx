"use client";
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
 *   toolbarActions {ReactNode|Function} Extra controls rendered beside the search input
 *   pageSizeOptions {number[]} Options for rows per page (default: [10, 20, 30])
 */

import { useEffect, useMemo, useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import styles from "./DataTable.module.css";

function sortValue(value) {
  if (value === null || value === undefined) return "";

  const date = new Date(value);
  if (
    typeof value === "string" &&
    value.trim() &&
    !Number.isNaN(date.getTime()) &&
    /[-/]|[A-Za-z]{3,}/.test(value)
  ) {
    return date.getTime();
  }

  const number = Number(String(value).replace(/,/g, ""));
  if (String(value).trim() !== "" && !Number.isNaN(number)) return number;

  return String(value).toLowerCase();
}

export default function DataTable({
  title,
  columns,
  data,
  loading,
  emptyText = "No records found.",
  toolbarActions = null,
  pageSizeOptions = [10, 20, 30],
}) {
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [isCompactPager, setIsCompactPager] = useState(false);
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const left = sortValue(a[sortConfig.key]);
      const right = sortValue(b[sortConfig.key]);

      if (left < right) return sortConfig.direction === "asc" ? -1 : 1;
      if (left > right) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  const { query, setQuery, page, setPage, rows, total, pages, filtered } =
    usePagination(sortedData, pageSize);

  useEffect(() => {
    const queryList = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsCompactPager(queryList.matches);

    handleChange();
    queryList.addEventListener("change", handleChange);

    return () => queryList.removeEventListener("change", handleChange);
  }, []);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((current) => {
      const direction =
        current.key === key && current.direction === "asc" ? "desc" : "asc";

      return { key, direction };
    });
    setPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = isCompactPager ? 3 : 5;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, page - half);
    let end = Math.min(pages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    return {
      pageNumbers,
      showStartEllipsis: start > 1,
      showEndEllipsis: end < pages,
    };
  };

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <h3 className={styles.tableTitle}>{title}</h3>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter records..."
            aria-label="Filter table records"
          />
          {typeof toolbarActions === "function"
            ? toolbarActions({ filteredRows: filtered, query, total })
            : toolbarActions}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.className ? styles[col.className] : undefined}>
                  <button
                    type="button"
                    className={styles.headerSortTrigger}
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.label} ${
                      sortConfig.key === col.key &&
                      sortConfig.direction === "asc"
                        ? "descending"
                        : "ascending"
                    }`}>
                    <span>{col.label}</span>
                    {sortConfig.key === col.key ? (
                      <span className={styles.sortButton} aria-hidden="true">
                        {sortConfig.direction === "asc" ? "^" : "v"}
                      </span>
                    ) : null}
                  </button>
                </th>
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
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.className ? styles[col.className] : undefined
                      }>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
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
          <div className={styles.paginationLeft}>
            <span className={styles.paginationInfo}>
              Showing {Math.min(total, (page - 1) * pageSize + rows.length)} of{" "}
              {total} records
            </span>
            <div className={styles.rowsPerPage}>
              <label htmlFor="rowsPerPage">Rows per page:</label>
              <select
                id="rowsPerPage"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {pages > 1 && (
            <div className={styles.paginationBtns}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className={styles.pageBtn}
                aria-label="First page">
                &laquo;
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`${styles.pageBtn} ${styles.mobileOptionalPageBtn}`}
                aria-label="Previous page">
                &lsaquo;
              </button>
              {(() => {
                const { pageNumbers, showStartEllipsis, showEndEllipsis } =
                  getPageNumbers();
                return (
                  <>
                    {showStartEllipsis && (
                      <>
                        <button
                          onClick={() => setPage(1)}
                          className={styles.pageBtn}
                          aria-label="Page 1">
                          1
                        </button>
                        <span className={styles.ellipsis}>...</span>
                      </>
                    )}
                    {pageNumbers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                        aria-current={p === page ? "page" : undefined}>
                        {p}
                      </button>
                    ))}
                    {showEndEllipsis && (
                      <>
                        <span className={styles.ellipsis}>...</span>
                        <button
                          onClick={() => setPage(pages)}
                          className={styles.pageBtn}
                          aria-label={`Page ${pages}`}>
                          {pages}
                        </button>
                      </>
                    )}
                  </>
                );
              })()}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pages}
                className={`${styles.pageBtn} ${styles.mobileOptionalPageBtn}`}
                aria-label="Next page">
                &rsaquo;
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page === pages}
                className={styles.pageBtn}
                aria-label="Last page">
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
