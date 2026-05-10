"use client";
/**
 * hooks/usePagination.js
 * Searchable, paginated view over a dataset.
 */

import { useState, useMemo } from "react";
import { normalise } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

export function usePagination(data = [], pageSize = DEFAULT_PAGE_SIZE) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = normalise(query);
    return data.filter((row) =>
      Object.values(row).some((v) => normalise(String(v ?? "")).includes(q)),
    );
  }, [data, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);

  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSetQuery(q) {
    setQuery(q);
    setPage(1);
  }

  return {
    query,
    setQuery: handleSetQuery,
    filtered,
    page: safePage,
    setPage,
    rows,
    total: filtered.length,
    pages,
    pageSize,
  };
}
