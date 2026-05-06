import Image from 'next/image'
import styles from './MaintenanceScreen.module.css'

export default function MaintenanceScreen() {
  const message =
    process.env.MAINTENANCE_MESSAGE ||
    'The MTV Portal is temporarily unavailable while we perform system updates.'

  const eta = process.env.MAINTENANCE_ETA || 'Please check back shortly.'

  return (
    <section className={styles.page} aria-labelledby="maintenance-title">
      <div className={styles.panel}>
        <Image
          className={styles.logo}
          src="/nmis-logo.svg"
          width={92}
          height={92}
          alt="NMIS logo"
          priority
        />

        <p className={styles.kicker}>System Update</p>
        <h1 id="maintenance-title">We will be back soon</h1>
        <p className={styles.message}>{message}</p>

        <div className={styles.statusBox}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>{eta}</span>
        </div>

        <p className={styles.footerText}>
          Thank you for your patience. NMIS RTOC III is working to restore access.
        </p>
      </div>
    </section>
  )
}
