"use client";

import styles from "./CertCard.module.css";

export default function CertCard() {
  return (
    <section className={styles.card} aria-labelledby="ghp-certificate-heading">
      <div className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true">📄</div>
        <div className={styles.headerText}>
          <h3 id="ghp-certificate-heading">GHP Certificate</h3>
          <p>Certificates are issued after seminar attendance and a passing result.</p>
        </div>
      </div>
      <div className={styles.body}>
        <p className={styles.lockedMsg}>
          GHP certificates are not sent by email. NMIS will provide the printed,
          signed certificate after your seminar result is recorded.
        </p>
      </div>
    </section>
  );
}
