/**
 * components/home/HeroSection.jsx
 */

import styles from "./HeroSection.module.css";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <Image
        src="/images/vehicle-photos/mtv-hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.heroImage}
      />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            MTV Portal
            <br />
            System
          </h1>
          <h2 className={styles.subtitle}>
            One-stop platform for MTV registration and compliance
          </h2>
          <p>
            Review requirements, complete GHP orientation, submit your MTV
            application, and verify records in one organized portal.
          </p>
          <div className={styles.actions}>
            <Link href="/apply" className="btn btn-white">
              MTV Application
            </Link>
            <Link href="/verify" className={styles.btnOutlineWhite}>
              Verify MTV
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
