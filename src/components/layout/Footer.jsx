/**
 * components/layout/Footer.jsx
 */

import { COPYRIGHT, NAV_ITEMS, OFFICE_INFO } from "@/lib/constants";
import styles from "./Footer.module.css";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.brandBlock}>
          <span className={styles.logo}>
            <Image
              src="/nmis-logo.svg"
              alt="NMIS logo"
              width={52}
              height={52}
            />
          </span>
          <div>
            <h2>MTV Portal</h2>
            <p>
              Registration and compliance services for Meat Transport Vehicles
              in Central Luzon.
            </p>
          </div>
        </div>

        <nav className={styles.links} aria-label="Footer navigation">
          {NAV_ITEMS.slice(0, 6).map((item) => (
            <Link key={item.id} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.office}>
          <strong>NMIS RTOC III</strong>
          <span>{OFFICE_INFO.phone}</span>
          <a href={`mailto:${OFFICE_INFO.email}`}>{OFFICE_INFO.email}</a>
        </div>
      </div>
      <div className={`container ${styles.dividerWrap}`}>
        <div className={styles.divider} />
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>{COPYRIGHT}</span>
        <span>This portal is maintained by NMIS.</span>
      </div>
    </footer>
  );
}
