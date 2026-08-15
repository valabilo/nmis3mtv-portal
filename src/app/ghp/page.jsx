"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import { isValidEmail } from "@/lib/utils";
import styles from "./ghp.module.css";

const fmt = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export default function GHPPage() {
  const { toastState, showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", contact: "", seminarDate: "", remarks: "" });
  const [schedules, setSchedules] = useState([]); const [saving, setSaving] = useState(false); const [submitted, setSubmitted] = useState(false); const [loading, setLoading] = useState(true);
  const update = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));
  async function loadSchedules() { setLoading(true); try { const response = await fetch("/api/ghp/appointment", { cache: "no-store" }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error); setSchedules(data.schedules); } catch (error) { showToast(error.message || "Unable to load seminar availability.", true); } finally { setLoading(false); } }
  useEffect(() => { loadSchedules(); }, []);
  async function submit(event) { event.preventDefault(); if (!form.name.trim() || !isValidEmail(form.email) || !form.seminarDate) return showToast("Please enter your full name, a valid email address, and select a seminar schedule.", true); setSaving(true); try { const response = await fetch("/api/ghp/appointment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error); setSubmitted(true); showToast("Your GHP seminar booking has been saved."); } catch (error) { showToast(error.message || "Unable to submit your booking.", true); await loadSchedules(); } finally { setSaving(false); } }

  return <>
    <div className="page-hero"><div className="container"><h1>Good Hygienic Practice (GHP) Seminar</h1><p>Choose an available GHP seminar schedule for MTV registration.</p></div></div>
    <main className={styles.page}><div className="container">
      <section className={styles.overview}><div><span className={styles.kicker}>GHP Certification</span><h2>Book your seminar, then await your examination result.</h2><p>Seminars are held on the displayed dates and each schedule has a maximum of 30 participants. Examination results are recorded by NMIS and sent to your email.</p></div><div className={styles.summaryGrid}><div><span>Step 1</span><strong>Choose a schedule</strong></div><div><span>Step 2</span><strong>Attend the seminar</strong></div><div><span>Step 3</span><strong>Receive your result</strong></div></div></section>
      <section className={styles.reminders}><h2>Important Reminders</h2><ul><li>Use the name that should appear on your certificate.</li><li>Schedules are first-come, first-served and close at 30 bookings.</li><li>Certificates are printed and signed manually by NMIS after a passing result.</li></ul></section>
      <section className={styles.appointmentCard}><h2>Book a GHP seminar schedule</h2>{submitted ? <div className={styles.success}>Your booking has been received for <strong>{fmt(form.seminarDate)}</strong>. Please attend on time. NMIS will email your examination result after it is manually recorded.</div> : <form className={styles.appointmentForm} onSubmit={submit}>
        <label>Full name *<input value={form.name} onChange={update("name")} required placeholder="Name for your certificate" /></label>
        <label>Email address *<input type="email" value={form.email} onChange={update("email")} required placeholder="you@email.com" /></label>
        <label>Contact number<input value={form.contact} onChange={update("contact")} placeholder="Optional" /></label>
        <fieldset className={styles.schedulePicker}><legend>Available seminar schedules *</legend>{loading ? <p>Loading available schedules…</p> : <div className={styles.tableWrap}><table className={styles.scheduleTable}><thead><tr><th scope="col">Seminar date</th><th scope="col">Booked</th><th scope="col">Available</th><th scope="col"><span className="sr-only">Select schedule</span></th></tr></thead><tbody>{schedules.map((schedule) => { const selected = form.seminarDate === schedule.date; return <tr key={schedule.date} className={selected ? styles.selectedSchedule : ""}><td data-label="Seminar date">{fmt(schedule.date)}</td><td data-label="Booked">{schedule.booked} / {schedule.capacity}</td><td data-label="Available"><strong className={schedule.available ? styles.seatsOpen : styles.seatsFull}>{schedule.available} {schedule.available === 1 ? "seat" : "seats"}</strong></td><td data-label="Action"><label className={styles.selectSchedule}><input type="radio" name="seminarDate" value={schedule.date} checked={selected} onChange={update("seminarDate")} disabled={!schedule.available} />{schedule.available ? "Select" : "Full"}</label></td></tr>; })}</tbody></table></div>}</fieldset>
        <label className={styles.fullWidth}>Notes<textarea value={form.remarks} onChange={update("remarks")} rows="3" placeholder="Optional" /></label>
        <button className="btn btn-primary btn-lg" disabled={saving || loading}>{saving ? "Saving booking…" : "Book seminar schedule"}</button>
      </form>}</section>
    </div></main><Toast {...toastState} /></>;
}
