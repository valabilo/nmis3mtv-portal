"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import { isValidEmail } from "@/lib/utils";
import styles from "./ghp.module.css";

const fmt = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthName = (date) =>
  date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

async function uploadValidId(file) {
  const init = await fetch("/api/drive/init-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: `GHP_Valid_ID_${Date.now()}_${file.name}`.replace(
        /[\\/:*?\"<>|]/g,
        "-",
      ),
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      purpose: "ghp-id",
    }),
  });
  const session = await init.json();
  if (!init.ok || !session.success)
    throw new Error(session.error || "Unable to prepare the ID upload.");
  const chunkSize = 4 * 1024 * 1024;
  let fileId = "";
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size);
    const body = new FormData();
    body.append("uploadUrl", session.uploadUrl);
    body.append("chunk", file.slice(start, end, file.type));
    body.append("rangeStart", String(start));
    body.append("rangeEnd", String(end - 1));
    body.append("totalSize", String(file.size));
    body.append("isLast", String(end === file.size));
    const response = await fetch("/api/drive/upload-chunk", {
      method: "POST",
      body,
    });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.error || "Unable to upload the valid ID.");
    if (result.done) fileId = result.fileId;
  }
  if (!fileId) throw new Error("The valid ID upload did not finish.");
  return { fileId, fileName: file.name };
}

export default function GHPPage() {
  const { toastState, showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    companyName: "",
    position: "",
    meatEstablishment: "",
    validIdFileId: "",
    validIdFileName: "",
    seminarDate: "",
    seminarTime: "",
    remarks: "",
  });
  const [schedules, setSchedules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [booking, setBooking] = useState(null);
  const [emailSent, setEmailSent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [month, setMonth] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const appointmentId = useRef("");
  const update = (field) => (event) =>
    setForm((value) => ({ ...value, [field]: event.target.value }));
  const scheduleByDate = useMemo(
    () =>
      Object.fromEntries(
        schedules.map((schedule) => [schedule.date, schedule]),
      ),
    [schedules],
  );
  const selectedSchedule = scheduleByDate[form.seminarDate];
  const activeSchedule = scheduleByDate[activeDate];
  const calendarMonth =
    month ||
    (schedules[0] ? new Date(`${schedules[0].date}T00:00:00`) : new Date());
  const firstDate = schedules[0] && new Date(`${schedules[0].date}T00:00:00`);
  const lastDate =
    schedules.at(-1) && new Date(`${schedules.at(-1).date}T00:00:00`);
  const canGoPrevious =
    firstDate &&
    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1) >
      new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const canGoNext =
    lastDate &&
    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1) <
      new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  async function loadSchedules(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/ghp/appointment", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setSchedules(data.schedules);
      setForm((current) =>
        data.schedules.some(
          (schedule) =>
            schedule.date === current.seminarDate &&
            schedule.sessions.some(
              (session) =>
                session.id === current.seminarTime && session.available > 0,
            ),
        )
          ? current
          : { ...current, seminarDate: "", seminarTime: "" },
      );
      if (data.schedules[0])
        setMonth(
          (current) =>
            current || new Date(`${data.schedules[0].date}T00:00:00`),
        );
    } catch (error) {
      showToast(error.message || "Unable to load seminar availability.", true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => {
    loadSchedules();
    const refreshId = window.setInterval(() => loadSchedules(false), 15000);
    return () => window.clearInterval(refreshId);
  }, []);
  function openDate(date) {
    const schedule = scheduleByDate[date];
    if (!schedule || !schedule.available) return;
    setActiveDate(date);
    setDialogOpen(true);
  }
  function selectSession(session) {
    if (!session.available) return;
    setForm((value) => ({
      ...value,
      seminarDate: activeDate,
      seminarTime: session.id,
    }));
    setDialogOpen(false);
  }
  async function selectValidId(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      event.target.value = "";
      return showToast(
        "Upload a PDF, JPG, or PNG valid ID no larger than 10 MB.",
        true,
      );
    }
    setSaving(true);
    try {
      const uploaded = await uploadValidId(file);
      setForm((value) => ({
        ...value,
        validIdFileId: uploaded.fileId,
        validIdFileName: uploaded.fileName,
      }));
      showToast("Valid ID uploaded successfully.");
    } catch (error) {
      event.target.value = "";
      showToast(error.message || "Unable to upload the valid ID.", true);
    } finally {
      setSaving(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !isValidEmail(form.email) ||
      !form.contact.trim() ||
      !form.companyName.trim() ||
      !form.position ||
      !form.meatEstablishment.trim() ||
      !form.validIdFileId ||
      !form.seminarDate ||
      !form.seminarTime
    ) {
      setShowErrors(true);
      return showToast(
        "Complete every required field, upload a valid ID, and select a seminar date and time.",
        true,
      );
    }
    setSaving(true);
    try {
      appointmentId.current ||= crypto.randomUUID();
      const response = await fetch("/api/ghp/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, appointmentId: appointmentId.current }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setEmailSent(data.emailSent !== false);
      setBooking(data.appointment);
      setSubmitted(true);
      showToast(
        data.warning ||
          "Your GHP seminar booking has been saved. A confirmation email has been sent.",
        Boolean(data.warning),
      );
    } catch (error) {
      showToast(error.message || "Unable to submit your booking.", true);
      await loadSchedules();
    } finally {
      setSaving(false);
    }
  }
  const first = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  );
  const cells = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        index - first.getDay() + 1,
      ),
  );
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Good Hygienic Practice (GHP) Seminar</h1>
          <p>
            Choose an available GHP seminar date and session for MTV
            registration.
          </p>
        </div>
      </div>
      <main className={styles.page}>
        <div className="container">
          <section className={styles.overview}>
            <div>
              <span className={styles.kicker}>GHP Certification</span>
              <h2>Book your seminar, then await your examination result.</h2>
              <p>
                Choose a highlighted seminar date, then select the time that
                suits you. Each session has a maximum of 30 participants.
              </p>
            </div>
            <div className={styles.summaryGrid}>
              <div>
                <span>Step 1</span>
                <strong>Choose a date</strong>
              </div>
              <div>
                <span>Step 2</span>
                <strong>Select a session</strong>
              </div>
              <div>
                <span>Step 3</span>
                <strong>Receive your result</strong>
              </div>
            </div>
          </section>
          <section className={styles.reminders}>
            <h2>Important Reminders</h2>
            <ul>
              <li>Use the name that should appear on your certificate.</li>
              <li>
                Only highlighted dates are seminar days. Sessions are
                first-come, first-served.
              </li>
              <li>
                Certificates are printed and signed manually by NMIS after a
                passing result.
              </li>
            </ul>
          </section>
          <section className={styles.appointmentCard}>
            <h2>Book a GHP seminar schedule</h2>
            {submitted ? (
              <div className={styles.success}>
                Your booking has been received for{" "}
                <strong>
                  {fmt(booking.seminar_date)}, {booking.seminar_time}
                </strong>
                .{" "}
                {emailSent
                  ? "A confirmation email has been sent with your selected seminar schedule."
                  : "Please contact NMIS RTOC III because the confirmation email could not be sent."}{" "}
                NMIS will email your examination result after it is manually
                recorded.
              </div>
            ) : (
              <form className={styles.appointmentForm} onSubmit={submit} noValidate>
                <label>
                  Full name *
                  <input
                    className={showErrors && !form.name.trim() ? styles.invalid : ""}
                    value={form.name}
                    onChange={update("name")}
                    required
                    placeholder="Name for your certificate"
                  />
                </label>
                <label>
                  Email address *
                  <input
                    className={showErrors && !isValidEmail(form.email) ? styles.invalid : ""}
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    required
                    placeholder="you@email.com"
                  />
                </label>
                <label>
                  Contact number *
                  <input
                    className={showErrors && !form.contact.trim() ? styles.invalid : ""}
                    value={form.contact}
                    onChange={update("contact")}
                    placeholder="09XXXXXXXXX"
                    required
                  />
                </label>
                <label>
                  Name of company / trucking *
                  <input className={showErrors && !form.companyName.trim() ? styles.invalid : ""} value={form.companyName} onChange={update("companyName")} required />
                </label>
                <label>
                  Position *
                  <select className={showErrors && !form.position ? styles.invalid : ""} value={form.position} onChange={update("position")} required>
                    <option value="">Select position</option>
                    <option>Driver / Helper</option><option>Owner</option><option>Operator</option><option>Others</option>
                  </select>
                </label>
                <label>
                  NMIS-accredited meat establishment to be served *
                  <input className={showErrors && !form.meatEstablishment.trim() ? styles.invalid : ""} value={form.meatEstablishment} onChange={update("meatEstablishment")} required />
                </label>
                <label className={styles.fullWidth}>
                  Valid ID *
                  <input className={showErrors && !form.validIdFileId ? styles.invalid : ""} type="file" accept="application/pdf,image/jpeg,image/png" onChange={selectValidId} required />
                  <small>{form.validIdFileName ? `Uploaded: ${form.validIdFileName}` : "Upload a PDF, JPG, or PNG (maximum 10 MB)."}</small>
                </label>
                <fieldset className={styles.schedulePicker}>
                  <legend>Select a seminar date and time *</legend>
                  {loading ? (
                    <p>Loading available seminar dates…</p>
                  ) : (
                    <>
                      <div className={styles.calendarHeader}>
                        <button
                          type="button"
                          onClick={() =>
                            setMonth(
                              new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth() - 1,
                                1,
                              ),
                            )
                          }
                          disabled={!canGoPrevious}
                          aria-label="Previous month"
                        >
                          ‹
                        </button>
                        <strong>{monthName(calendarMonth)}</strong>
                        <button
                          type="button"
                          onClick={() =>
                            setMonth(
                              new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth() + 1,
                                1,
                              ),
                            )
                          }
                          disabled={!canGoNext}
                          aria-label="Next month"
                        >
                          ›
                        </button>
                      </div>
                      <div
                        className={styles.calendar}
                        role="grid"
                        aria-label="Available GHP seminar dates"
                      >
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <span className={styles.weekday} key={day}>
                              {day}
                            </span>
                          ),
                        )}
                        {cells.map((date) => {
                          const key = dateKey(date);
                          const schedule = scheduleByDate[key];
                          const currentMonth =
                            date.getMonth() === calendarMonth.getMonth();
                          const selected = form.seminarDate === key;
                          return (
                            <button
                              type="button"
                              role="gridcell"
                              key={key}
                              className={`${styles.day} ${!currentMonth ? styles.otherMonth : ""} ${schedule ? styles.availableDay : ""} ${selected ? styles.selectedDay : ""}`}
                              disabled={!schedule?.available}
                              onClick={() => openDate(key)}
                              aria-label={
                                schedule
                                  ? `${fmt(key)}. ${schedule.available} seats available across sessions. Select time.`
                                  : fmt(key)
                              }
                            >
                              <span>{date.getDate()}</span>
                              {schedule && (
                                <small>{schedule.available} seats</small>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className={styles.calendarHint}>
                        Highlighted dates have available seminar sessions. Click
                        a date to choose a time.
                      </p>
                      {form.seminarDate && (
                        <div className={styles.selectedBooking}>
                          <span>Selected seminar</span>
                          <strong>
                            {fmt(form.seminarDate)} ·{" "}
                            {
                              selectedSchedule?.sessions.find(
                                (session) => session.id === form.seminarTime,
                              )?.label
                            }
                          </strong>
                          <button
                            type="button"
                            onClick={() => openDate(form.seminarDate)}
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </fieldset>
                <label className={styles.fullWidth}>
                  Notes
                  <textarea
                    value={form.remarks}
                    onChange={update("remarks")}
                    rows="3"
                    placeholder="Optional"
                  />
                </label>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={saving || loading}
                >
                  {saving ? "Saving booking…" : "Book seminar schedule"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
      {dialogOpen && activeSchedule && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setDialogOpen(false)}
        >
          <section
            className={styles.timeModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeModal}
              onClick={() => setDialogOpen(false)}
              aria-label="Close time selection"
            >
              ×
            </button>
            <span className={styles.kicker}>Select a session</span>
            <h2 id="session-title">{fmt(activeDate)}</h2>
            <p>
              Choose from the available seminar sessions below. Each session has
              30 seats.
            </p>
            <div className={styles.sessionList}>
              {activeSchedule.sessions.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  className={styles.session}
                  disabled={!session.available}
                  onClick={() => selectSession(session)}
                >
                  <span>
                    <strong>{session.label}</strong>
                    <small>
                      {session.available
                        ? `${session.available} of ${session.capacity} seats available`
                        : "Session full"}
                    </small>
                  </span>
                  <b>{session.available ? "Select" : "Full"}</b>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      <Toast {...toastState} />
    </>
  );
}
