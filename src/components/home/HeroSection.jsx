"use client";

/**
 * components/home/HeroSection.jsx
 */

import styles from "./HeroSection.module.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMTVData } from "@/hooks/useMTVData";

function isExpired(record) {
  const status = String(record.status || "").toLowerCase();
  if (status === "cancelled" || status === "revoked" || status === "suspended") {
    return false;
  }

  const value = record.expiry || record.validity || "";
  if (!value) return status === "expired";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return status === "expired";
  }

  return date < new Date();
}

function isActive(record) {
  const status = String(record.status || "").toLowerCase();
  if (["cancelled", "expired", "revoked", "suspended", "inactive"].includes(status)) {
    return false;
  }

  return !isExpired(record);
}

function CountUp({ value, loading }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) {
      setDisplayValue(0);
      return undefined;
    }

    const target = Number(value) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return undefined;
    }

    const duration = 700;
    const start = performance.now();
    let frameId;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayValue(Math.round(target * progress));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [loading, value]);

  return displayValue.toLocaleString();
}

export default function HeroSection() {
  const { data, loading } = useMTVData("accredited");
  const heroStats = useMemo(() => {
    const total = data.length;
    const expired = data.filter(isExpired).length;
    const active = data.filter(isActive).length;

    return [
      { label: "Total MTV Issued", value: total },
      { label: "Total MTV Active", value: active },
      { label: "Total MTV Expired", value: expired },
    ];
  }, [data]);

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
          <div className={styles.statCards} aria-label="MTV record summary">
            {heroStats.map((item) => (
              <article key={item.label} className={styles.statCard}>
                <strong>
                  <CountUp value={item.value} loading={loading} />
                </strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
