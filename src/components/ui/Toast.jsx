"use client";

import styles from "./Toast.module.css";

export default function Toast({ message, visible, isError = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        styles.toast,
        visible ? styles.show : "",
        isError ? styles.error : "",
      ].join(" ")}>
      {message}
    </div>
  );
}
