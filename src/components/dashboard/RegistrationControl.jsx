"use client";

import { useEffect, useState } from "react";
import styles from "./RegistrationControl.module.css";

const empty = { enabled: true, close_at: "", reopen_at: "", message: "Registration is currently closed. Please check back later." };

export default function RegistrationControl() {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/registration", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setForm({ ...empty, ...data.settings, enabled: String(data.settings.enabled).toLowerCase() !== "false" });
      setStatus(data.status);
    } catch (error) { setMessage(error.message || "Unable to load registration controls."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/registration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setForm({ ...empty, ...data.settings, enabled: String(data.settings.enabled).toLowerCase() !== "false" });
      setStatus(data.status); setMessage("Registration controls saved.");
    } catch (error) { setMessage(error.message || "Unable to save registration controls."); }
    finally { setSaving(false); }
  }

  return <section className={styles.section}>
    <div className={styles.heading}><span>Public registration</span><h2>Registration availability</h2><p>Control new MTV applications and GHP seminar bookings. All scheduled times use Philippine time (Asia/Manila).</p></div>
    {status && <div className={status.open ? styles.open : styles.closed}><strong>{status.open ? "Registration is open" : "Registration is closed"}</strong><span>{status.open ? "Applicants can currently submit registrations." : status.message}</span></div>}
    {message && <div className={styles.message}>{message}</div>}
    {loading ? <p>Loading registration controls…</p> : <form className={styles.form} onSubmit={save}>
      <label className={styles.toggle}><input type="checkbox" checked={form.enabled} onChange={update("enabled")} /><span><strong>Allow public registration</strong><small>Turn this off to close registration immediately until you enable it again.</small></span></label>
      <div className={styles.grid}>
        <label>Close starting at<input type="datetime-local" value={form.close_at} onChange={update("close_at")} /></label>
        <label>Reopen at (optional)<input type="datetime-local" value={form.reopen_at} onChange={update("reopen_at")} /></label>
      </div>
      <p className={styles.help}>Set a close time to automatically stop registrations. Leave “Reopen at” blank to keep registration closed after that time; clear both fields to remove the schedule.</p>
      <label>Closed-registration message<textarea rows="3" maxLength="250" value={form.message} onChange={update("message")} /></label>
      <div><button disabled={saving}>{saving ? "Saving…" : "Save registration controls"}</button><button type="button" onClick={load} disabled={saving}>Refresh</button></div>
    </form>}
  </section>;
}
