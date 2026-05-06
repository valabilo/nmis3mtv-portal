/**
 * components/apply/FormProgress.jsx
 */

import styles from "./FormProgress.module.css";

const STEPS = [
  { label: "Applicant Info" },
  { label: "Vehicle Details" },
  { label: "Documents" },
  { label: "Review & Submit" },
];

export default function FormProgress({ currentStep }) {
  return (
    <div className={styles.bar} role="list" aria-label="Application form steps">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const isDone = num < currentStep;
        const isActive = num === currentStep;
        return (
          <div key={num} className={styles.stepGroup} role="listitem">
            <div
              className={[
                styles.step,
                isDone ? styles.done : "",
                isActive ? styles.active : "",
              ].join(" ")}>
              <div className={styles.num} aria-hidden="true">
                {isDone ? "✓" : num}
              </div>
              <span className={styles.label}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={styles.line} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
