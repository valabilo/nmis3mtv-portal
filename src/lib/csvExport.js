"use client";

const EXPORT_MAX_BYTES = 3 * 1024 * 1024;

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv({ filenameBase, columns, rows }) {
  const encoder = new TextEncoder();
  const header = `${columns.map(([label]) => csvCell(label)).join(",")}\n`;
  const chunks = [];
  let current = header;
  let currentSize = encoder.encode(current).length;

  rows.forEach((row) => {
    const line = `${columns
      .map(([, key]) => csvCell(typeof key === "function" ? key(row) : row[key]))
      .join(",")}\n`;
    const lineSize = encoder.encode(line).length;

    if (currentSize + lineSize > EXPORT_MAX_BYTES && current !== header) {
      chunks.push(current);
      current = header;
      currentSize = encoder.encode(current).length;
    }

    current += line;
    currentSize += lineSize;
  });

  chunks.push(current);

  const stamp = new Date().toISOString().slice(0, 10);
  chunks.forEach((chunk, index) => {
    const suffix = chunks.length > 1 ? `-part-${index + 1}` : "";
    downloadTextFile(`${filenameBase}-${stamp}${suffix}.csv`, chunk);
  });

  return chunks.length;
}
