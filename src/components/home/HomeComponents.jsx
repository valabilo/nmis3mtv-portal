/**
 * components/home/HomeComponents.jsx
 */

import { OFFICE_INFO } from "@/lib/constants";
import styles from "./HomeComponents.module.css";
import Link from "next/link";

const quickActions = [
  {
    icon: "REQ",
    title: "Requirements",
    desc: "Review the document checklist and registration guide before applying.",
    href: "/requirements",
    cta: "View Requirements",
  },
  {
    icon: "GHP",
    title: "GHP Orientation",
    desc: "Watch the required orientation, take the exam, and claim your certificate.",
    href: "/ghp",
    cta: "Start Orientation",
  },
  {
    icon: "MTV",
    title: "MTV Application",
    desc: "Submit a new MTV application or check the status of an existing one.",
    href: "/apply",
    cta: "Open Application",
  },
];

const processSteps = [
  {
    label: "Submit",
    desc: "Complete the application form and upload all required documents.",
  },
  {
    label: "Review",
    desc: "NMIS reviews your application details and document attachments.",
  },
  {
    label: "Payment",
    desc: "Pay the corresponding registration fee after receiving instructions.",
  },
  {
    label: "Issuance",
    desc: "Receive your Certificate of Registration and official MTV sticker.",
  },
];

const reminders = [
  "Ensure all required documents are complete before submission.",
  "Use a valid and active email address for notifications.",
  "Avoid duplicate or multiple submissions for the same vehicle.",
  "Upload clear and readable scanned documents or photos.",
  "Monitor your email for application updates from NMIS.",
];

const contactRows = [
  ["Office", "NMIS RTOC III"],
  ["Email", OFFICE_INFO.email],
  ["Telefax", OFFICE_INFO.phone],
  ["Address", OFFICE_INFO.address],
];

const hoursRows = [
  ["Days", "Monday - Friday"],
  ["Hours", "8:00 AM - 5:00 PM"],
  ["Closed", "Public holidays"],
];

function SectionHeading({ label, title, text }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function QuickActions() {
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionHeading
          label="Start Here"
          title="Choose What You Need Today"
          text="The most common MTV portal tasks are grouped here for quick access."
        />

        <div className={styles.quickGrid}>
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={styles.actionCard}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <h3>{action.title}</h3>
              <p>{action.desc}</p>
              <span className={styles.cardLink}>{action.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProcessSteps() {
  return (
    <section className={styles.processSection}>
      <div className="container">
        <SectionHeading
          label="Process"
          title="MTV Application Flow"
          text="A simple overview of what happens after you prepare your requirements."
        />

        <div className={styles.processGrid}>
          {processSteps.map((step, index) => (
            <article key={step.label} className={styles.processStep}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.label}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTAStrip() {
  return (
    <section className={styles.ctaStrip}>
      <div className={`container ${styles.ctaInner}`}>
        <div>
          <span className={styles.ctaLabel}>Ready to apply?</span>
          <h2>Submit or track your MTV application online.</h2>
          <p>Use the application page for new submissions and reference number lookups.</p>
        </div>
        <Link href="/apply" className={styles.ctaButton}>
          Open Application
        </Link>
      </div>
    </section>
  );
}

export function InfoCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <span className={styles.infoBadge}>REM</span>
              <h3>Important Reminders</h3>
            </div>
            <ul className={styles.checkList}>
              {reminders.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/requirements" className={styles.secondaryLink}>
              Review requirements
            </Link>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <span className={`${styles.infoBadge} ${styles.dangerBadge}`}>BAN</span>
              <h3>Banned MTV List</h3>
            </div>
            <p>
              Check the list of banned, suspended, or revoked MTV units before
              transacting.
            </p>
            <Link href="/banned" className={styles.dangerLink}>
              View banned list
            </Link>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <span className={`${styles.infoBadge} ${styles.helpBadge}`}>FAQ</span>
              <h3>Need Help?</h3>
            </div>
            <p>
              Send a message to NMIS RTOC III or review common questions about
              MTV registration.
            </p>
            <Link href="/contact" className={styles.secondaryLink}>
              Visit contact page
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

export function ContactBar() {
  return (
    <section className={styles.contactBand}>
      <div className={`container ${styles.contactGrid}`}>
        <div>
          <h2>Contact Us</h2>
          <div className={styles.contactRows}>
            {contactRows.map(([label, value]) => (
              <div key={label} className={styles.contactRow}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2>Office Hours</h2>
          <div className={styles.contactRows}>
            {hoursRows.map(([label, value]) => (
              <div key={label} className={styles.contactRow}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
