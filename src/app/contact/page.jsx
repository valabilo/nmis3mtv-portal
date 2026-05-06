"use client";
/**
 * app/contact/page.jsx - Contact Us Page (/contact)
 */

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import { DEMO_FAQS as FAQS } from "@/data/demoData";
import { OFFICE_INFO } from "@/lib/constants";
import styles from "./contact.module.css";

const SUBJECTS = [
  "Application Inquiry",
  "Status Follow-up",
  "Document Requirements",
  "Complaint / Report",
  "General Inquiry",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(null);
  const { toastState, showToast } = useToast();

  function update(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSend() {
    if (!form.name || !form.email || !form.subject || !form.message) {
      showToast("Please fill in all required fields.", true);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const emailNote = json.notificationSent
        ? " The NMIS contact inbox has been notified."
        : " Message was logged, but email notification was not sent.";
      showToast(`Message sent.${emailNote}`);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      showToast(
        err.message ||
          "Failed to send. Please email us directly at nmis.clu@da.gov.ph",
        true,
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p>Reach out to NMIS Regional Technical Operation Center III for inquiries and assistance.</p>
        </div>
      </div>

      <div className={styles.page}>
        <div className="container">
          <div className={styles.grid}>
            <div>
              <div className={styles.infoCard}>
                <h3>Office Information</h3>
                {[
                  [
                    "Office Name",
                    `National Meat Inspection Service\nRegional Technical Operation Center III`,
                  ],
                  ["Office Address", OFFICE_INFO.addressLines.join("\n")],
                  ["TELEFAX", OFFICE_INFO.phone],
                  ["Email", OFFICE_INFO.email],
                  [
                    "Office Hours",
                    "Monday-Friday: 8:00 AM - 5:00 PM\n(Except Public Holidays)",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className={styles.detail}>
                    <div>
                      <h4>{label}</h4>
                      {value.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.mapFrame}>
                <iframe
                  title="NMIS Regional Technical Operation Center III Office Map"
                  src={OFFICE_INFO.mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>

            <div className={styles.formCard}>
              <h3>Send a Message</h3>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="c_name">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  id="c_name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="c_email">
                  Email Address <span className="req">*</span>
                </label>
                <input
                  id="c_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="c_phone">Contact Number</label>
                <input
                  id="c_phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="c_subject">
                  Subject <span className="req">*</span>
                </label>
                <select
                  id="c_subject"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}>
                  <option value="">-- Select Subject --</option>
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label htmlFor="c_message">
                  Message <span className="req">*</span>
                </label>
                <textarea
                  id="c_message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Write your message here..."
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleSend}
                disabled={sending}>
                {sending ? "Sending..." : "Send Message"}
              </button>

              <div style={{ marginTop: 32 }}>
                <h3 className={styles.faqTitle}>Frequently Asked Questions</h3>
                {FAQS.map((f, i) => (
                  <div key={i} className={styles.faqItem}>
                    <button
                      className={styles.faqQ}
                      onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                      aria-expanded={openFAQ === i}>
                      {f.q}
                      <span aria-hidden="true">
                        {openFAQ === i ? "-" : "+"}
                      </span>
                    </button>
                    {openFAQ === i && <div className={styles.faqA}>{f.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast {...toastState} />
    </>
  );
}
