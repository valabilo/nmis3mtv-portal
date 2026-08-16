"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./GHPAppointments.module.css";

const fmt = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "short", day: "numeric" }) : "Unscheduled";
const passed = (item) => item.exam_result === "PASSED" && item.certificate_number;

export default function GHPAppointments() {
  const [items, setItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [savingId, setSavingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState([]);
  const dates = useMemo(() => [...new Set(items.map((item) => item.seminar_date || ""))].sort(), [items]);
  const attendees = useMemo(() => items.filter((item) => item.seminar_date === selectedDate), [items, selectedDate]);
  const selectable = attendees.filter((item) => passed(item) && item.certificate_ready);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ghp", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load GHP bookings.");
      setItems(data.appointments);
      setSelectedDate((current) => current && data.appointments.some((item) => item.seminar_date === current) ? current : [...new Set(data.appointments.map((item) => item.seminar_date || ""))].sort()[0] || "");
    } catch (error) {
      setMessage(error.message || "Unable to load GHP bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setSelected([]); }, [selectedDate]);

  async function saveScore(item) {
    const score = scores[item.appointment_id] ?? String(item.exam_score || "").replace("/10", "");
    if (score === "") { setMessage("Enter a score from 0 to 10 before saving."); return; }
    setSavingId(item.appointment_id); setMessage("");
    try {
      const response = await fetch("/api/admin/ghp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: item.appointment_id, score }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setMessage(`${item.name}: ${data.appointment.exam_result === "PASSED" ? "Passed — certificate queued for Apps Script generation." : "Not passed."}`);
      setItems((current) => current.map((record) => record.appointment_id === item.appointment_id ? data.appointment : record));
      setEditingId("");
    } catch (error) { setMessage(error.message || "Unable to save the exam score."); }
    finally { setSavingId(""); }
  }

  function editScore(item, event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    setScores((current) => ({ ...current, [item.appointment_id]: String(item.exam_score || "").replace("/10", "") }));
    setEditingId(item.appointment_id);
  }

  async function deleteAppointment(item, event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    if (!window.confirm(`Delete the GHP seminar record for ${item.name}? This cannot be undone.`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/admin/ghp?appointmentId=${encodeURIComponent(item.appointment_id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setItems((current) => current.filter((record) => record.appointment_id !== item.appointment_id));
      setSelected((current) => current.filter((id) => id !== item.appointment_id));
      setMessage(`${item.name}'s GHP seminar record was deleted.`);
    } catch (error) { setMessage(error.message || "Unable to delete the GHP appointment."); }
  }

  async function syncResults() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ghp", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-manual-results" }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setMessage([data.message, ...(data.errors || [])].join(" ")); await load();
    } catch (error) { setMessage(error.message || "Result sync failed."); }
    finally { setBusy(false); }
  }

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const download = (id) => window.open(`/api/admin/ghp/certificate?appointmentId=${encodeURIComponent(id)}&download=1`, "_blank", "noopener,noreferrer");
  const downloadSelected = () => selected.forEach((id, index) => window.setTimeout(() => download(id), index * 200));

  return <section className={styles.section}>
    <div className={styles.heading}><div><span>GHP Certification</span><h2>Seminar attendees and exam results</h2><p>Enter the score earned out of 10. A score of 7 or higher automatically passes and queues a certificate.</p></div><div className={styles.actions}><button onClick={load} disabled={loading}>Refresh</button><button className={styles.primary} onClick={syncResults} disabled={busy || loading}>{busy ? "Sending…" : "Send result emails"}</button></div></div>
    {message && <div className={styles.message}>{message}</div>}
    {loading ? <div className={styles.loading} aria-live="polite"><div className={styles.loadingLine} /><div className={styles.loadingLine} /><div className={styles.loadingLine} /><span>Loading GHP seminars…</span></div> : dates.length ? <>
      <label className={styles.dateSelect}>Seminar date<select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>{dates.map((date) => <option value={date} key={date}>{fmt(date)}</option>)}</select></label>
      <div className={styles.batch}><div className={styles.batchHeader}><div><span>Selected seminar</span><h3>{fmt(selectedDate)}</h3></div><strong>{attendees.length} attendee{attendees.length === 1 ? "" : "s"}</strong></div>
        {selectable.length > 0 && <div className={styles.certificateActions}><label><input type="checkbox" checked={selected.length === selectable.length} onChange={(event) => setSelected(event.target.checked ? selectable.map((item) => item.appointment_id) : [])} /> Select all passed examinees</label><button onClick={downloadSelected} disabled={!selected.length}>Download selected ({selected.length})</button></div>}
        <div className={styles.tableWrap}><table className={styles.attendeeTable}><thead><tr><th>Certificate</th><th>Client</th><th>Session</th><th>Score / 10</th><th>Result</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{attendees.map((item) => {
          const result = item.exam_result === "PASSED" ? "Passed" : item.exam_result === "FAILED" ? "Not passed" : "Not recorded";
          const isEditing = editingId === item.appointment_id;
          return <tr key={item.appointment_id}><td data-label="Certificate">{passed(item) ? item.certificate_ready ? <input type="checkbox" checked={selected.includes(item.appointment_id)} onChange={() => toggle(item.appointment_id)} aria-label={`Select ${item.name}'s certificate`} /> : <span className={styles.generating}>Generating…</span> : "—"}</td><td data-label="Client"><strong>{item.name}</strong><span>{item.email}</span></td><td data-label="Session">{item.seminar_time || "—"}</td><td data-label="Score / 10">{isEditing ? <div className={styles.scoreField}><input className={styles.scoreInput} type="number" min="0" max="10" step="0.1" value={scores[item.appointment_id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [item.appointment_id]: event.target.value }))} placeholder="0" autoFocus /><span>/ 10</span><button className={styles.saveButton} onClick={() => saveScore(item)} disabled={savingId === item.appointment_id}>{savingId === item.appointment_id ? "Saving…" : "Save"}</button><button className={styles.cancelButton} onClick={() => setEditingId("")}>Cancel</button></div> : <strong>{item.exam_score || "—"}</strong>}</td><td data-label="Result"><strong className={item.exam_result === "PASSED" ? styles.passed : item.exam_result === "FAILED" ? styles.failed : ""}>{result}</strong></td><td data-label="Actions"><details className={styles.rowMenu}><summary aria-label={`Actions for ${item.name}`}>⋮</summary><div className={styles.menuPanel}><button onClick={(event) => editScore(item, event)}>Edit score</button>{passed(item) && <button disabled={!item.certificate_ready} title={item.certificate_ready ? "Download certificate" : "Certificate is still being generated"} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); download(item.appointment_id); }}>{item.certificate_ready ? "Download certificate" : "Certificate generating…"}</button>}<button className={styles.deleteAction} onClick={(event) => deleteAppointment(item, event)}>Delete</button></div></details></td></tr>;
        })}</tbody></table></div>
      </div>
    </> : <div className={styles.empty}>No GHP seminar bookings yet.</div>}
  </section>;
}
