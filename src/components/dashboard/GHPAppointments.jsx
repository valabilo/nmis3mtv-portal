"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./GHPAppointments.module.css";

const POPUP_VISIBLE_MS = 10000;
const fmt = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "short", day: "numeric" }) : "Unscheduled";
const passed = (item) => item.exam_result === "PASSED" && item.certificate_number;
const filename = (item) => `NMIS_GHP_Certificate_${String(item.certificate_number).replace(/[^a-z0-9-]/gi, "_")}_${String(item.name).trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}.pdf`;

export default function GHPAppointments() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState("");
  const [session, setSession] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState("");
  const [editing, setEditing] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState(false);

  const dates = useMemo(() => [...new Set(items.map((item) => item.seminar_date || ""))].sort(), [items]);
  const sessions = useMemo(() => [...new Set(items.filter((item) => item.seminar_date === date).map((item) => item.seminar_time || "Unscheduled"))].sort(), [items, date]);
  const attendees = useMemo(() => items.filter((item) => item.seminar_date === date && (!session || (item.seminar_time || "Unscheduled") === session) && String(item.name || "").toLowerCase().includes(query.toLowerCase())), [items, date, session, query]);
  const selectable = attendees.filter((item) => passed(item) && item.certificate_ready);
  const disabled = loading || busy || downloading || !!saving;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ghp", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load GHP bookings.");
      setItems(data.appointments);
      setDate((current) => current && data.appointments.some((item) => item.seminar_date === current) ? current : [...new Set(data.appointments.map((item) => item.seminar_date || ""))].sort()[0] || "");
    } catch (error) { setMessage(error.message || "Unable to load GHP bookings."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setSession(""); setSelected([]); }, [date]);
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), POPUP_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const closeMenus = (event) => document.querySelectorAll(`.${styles.rowMenu}[open]`).forEach((menu) => { if (!menu.contains(event.target)) menu.removeAttribute("open"); });
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  async function saveScore(item) {
    const score = scores[item.appointment_id] ?? String(item.exam_score || "").replace("/10", "");
    if (!/^(?:[1-9]|10)$/.test(score)) return setMessage("Enter a whole-number score from 1 to 10.");
    setSaving(item.appointment_id);
    try {
      const response = await fetch("/api/admin/ghp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: item.appointment_id, score }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setItems((all) => all.map((record) => record.appointment_id === item.appointment_id ? { ...record, ...data.appointment } : record));
      setEditing(""); setMessage(data.appointment.exam_result === "PASSED" ? "Certificate created and ready to download." : "Score saved.");
    } catch (error) { setMessage(error.message || "Unable to save score."); }
    finally { setSaving(""); }
  }

  async function rename(item) {
    if (name.trim().length < 2) return setMessage("Enter a valid attendee name.");
    setSaving(item.appointment_id);
    try {
      const response = await fetch("/api/admin/ghp", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rename", appointmentId: item.appointment_id, name: name.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setItems((all) => all.map((record) => record.appointment_id === item.appointment_id ? { ...record, ...data.appointment } : record));
      setEditing(""); setMessage("Name updated and the issued certificate refreshed.");
    } catch (error) { setMessage(error.message || "Unable to update name."); }
    finally { setSaving(""); }
  }

  async function remove(item) {
    if (!window.confirm(`Delete ${item.name}'s GHP seminar record?`)) return;
    setSaving(item.appointment_id);
    try {
      const response = await fetch(`/api/admin/ghp?appointmentId=${encodeURIComponent(item.appointment_id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setItems((all) => all.filter((record) => record.appointment_id !== item.appointment_id));
    } catch (error) { setMessage(error.message || "Unable to delete appointment."); }
    finally { setSaving(""); }
  }

  async function sync() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ghp", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-manual-results" }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setMessage([data.message, ...(data.errors || [])].join(" "));
      await load();
    } catch (error) { setMessage(error.message || "Result sync failed."); }
    finally { setBusy(false); }
  }

  async function download(item) {
    const response = await fetch(`/api/admin/ghp/certificate?appointmentId=${encodeURIComponent(item.appointment_id)}&download=1`);
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Certificate download failed."); }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = filename(item);
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function downloadSelected() {
    if (!selected.length) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/admin/ghp/certificate?ids=${encodeURIComponent(selected.join(","))}&zip=1`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Certificate zip download failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `NMIS_GHP_Certificates_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`${selected.length} certificate${selected.length === 1 ? "" : "s"} downloaded as a ZIP file.`);
    } catch (error) { setMessage(error.message || "Certificate download failed."); }
    finally { setDownloading(false); }
  }

  function toggleCertificateSelection(id) {
    setSelected((all) => all.includes(id) ? all.filter((selectedId) => selectedId !== id) : [...all, id]);
  }

  function openMenuAction(event, callback) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    callback();
  }

  return <section className={styles.section}>
    <div className={styles.heading}><div><span>GHP Certification</span><h2>Seminar attendees and exam results</h2><p>A passing score creates the certificate immediately.</p></div><div className={styles.actions}><button onClick={load} disabled={disabled}>Refresh</button><button className={styles.primary} onClick={sync} disabled={disabled}>{busy ? "Sending…" : "Send result emails"}</button></div></div>
    {message && <div className={styles.message}>{message}</div>}
    {loading ? <div className={styles.loading}>Loading GHP seminars…</div> : dates.length ? <>
      <div className={styles.filters}>
        <label className={styles.dateSelect}>Seminar date<select disabled={disabled} value={date} onChange={(event) => setDate(event.target.value)}>{dates.map((value) => <option key={value} value={value}>{fmt(value)}</option>)}</select></label>
        <label className={styles.dateSelect}>Session time<select disabled={disabled} value={session} onChange={(event) => setSession(event.target.value)}><option value="">All sessions</option>{sessions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className={styles.search}>Search attendee name<input disabled={disabled} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter attendee name" /></label>
      </div>
      <div className={styles.batch}>
        <div className={styles.batchHeader}><div><span>Selected seminar</span><h3>{fmt(date)}{session ? ` · ${session}` : ""}</h3></div><strong>{attendees.length} attendee{attendees.length === 1 ? "" : "s"}</strong></div>
        {selectable.length > 0 && <div className={styles.certificateActions}><label><input type="checkbox" disabled={disabled} checked={selected.length === selectable.length} onChange={(event) => setSelected(event.target.checked ? selectable.map((item) => item.appointment_id) : [])} /> Select all passed examinees</label><button disabled={!selected.length || disabled} onClick={downloadSelected}>{downloading ? "Downloading…" : `Download selected (${selected.length})`}</button></div>}
        <div className={styles.tableWrap}><table className={styles.attendeeTable}><thead><tr><th>Certificate</th><th>Client</th><th>Session</th><th>Score / 10</th><th>Result</th><th>Actions</th></tr></thead><tbody>
          {attendees.map((item) => {
            const scoreEdit = editing === item.appointment_id;
            const nameEdit = editing === `name-${item.appointment_id}`;
            return <tr key={item.appointment_id} onDoubleClick={() => { if (!disabled && passed(item) && item.certificate_ready) toggleCertificateSelection(item.appointment_id); }}>
              <td>{passed(item) && item.certificate_ready ? <input type="checkbox" disabled={disabled} checked={selected.includes(item.appointment_id)} onChange={() => toggleCertificateSelection(item.appointment_id)} /> : "—"}</td>
              <td>{nameEdit ? <div className={styles.nameField}><input disabled={disabled} value={name} onChange={(event) => setName(event.target.value)} autoFocus /><button className={styles.saveButton} disabled={disabled} onClick={() => rename(item)}>{saving === item.appointment_id ? "Saving…" : "Save name"}</button><button className={styles.cancelButton} disabled={disabled} onClick={() => setEditing("")}>Cancel</button></div> : <><strong>{item.name}</strong><span>{item.email}</span></>}</td>
              <td>{item.seminar_time || "—"}</td>
              <td>{scoreEdit ? <div className={styles.scoreField}><input className={styles.scoreInput} disabled={disabled} type="number" min="1" max="10" step="1" value={scores[item.appointment_id] ?? ""} onChange={(event) => setScores((all) => ({ ...all, [item.appointment_id]: event.target.value }))} autoFocus /><button className={styles.saveButton} disabled={disabled} onClick={() => saveScore(item)}>{saving === item.appointment_id ? "Saving…" : "Save"}</button><button className={styles.cancelButton} disabled={disabled} onClick={() => setEditing("")}>Cancel</button></div> : item.exam_score || "—"}</td>
              <td>{item.exam_result === "PASSED" ? "Passed" : item.exam_result === "FAILED" ? "Not passed" : "Not recorded"}</td>
              <td><details className={styles.rowMenu}><summary aria-label={`Actions for ${item.name}`}>⋮</summary><div className={styles.menuPanel}>
                <button disabled={disabled} onClick={(event) => openMenuAction(event, () => { setScores((all) => ({ ...all, [item.appointment_id]: String(item.exam_score || "").replace("/10", "") })); setEditing(item.appointment_id); })}>Edit score</button>
                <button disabled={disabled} onClick={(event) => openMenuAction(event, () => { setName(item.name); setEditing(`name-${item.appointment_id}`); })}>Edit name</button>
                {passed(item) && item.certificate_ready && <button disabled={disabled} onClick={(event) => openMenuAction(event, async () => { setDownloading(true); try { await download(item); } catch (error) { setMessage(error.message); } finally { setDownloading(false); } })}>Download certificate</button>}
                <button className={styles.deleteAction} disabled={disabled} onClick={(event) => openMenuAction(event, () => remove(item))}>Delete</button>
              </div></details></td>
            </tr>;
          })}
        </tbody></table></div>
      </div>
    </> : <div className={styles.empty}>No GHP seminar bookings yet.</div>}
  </section>;
}
