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

export default function FormProgress({
  currentStep,
  onStepChange,
  isStepEnabled,
  disabled = false,
}) {
  return (
    <div className={styles.bar} role="list" aria-label="Application form steps">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const isDone = num < currentStep;
        const isActive = num === currentStep;
        const stepDisabled = disabled || isStepEnabled?.(num) === false;

        return (
          <div key={num} className={styles.stepGroup} role="listitem">
            <button
              type="button"
              className={[
                styles.step,
                isDone ? styles.done : "",
                isActive ? styles.active : "",
              ].join(" ")}
              disabled={stepDisabled}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Go to step ${num}: ${s.label}`}
              onClick={() => onStepChange?.(num)}>
              <div className={styles.num} aria-hidden="true">
                {isDone ? "\u2713" : num}
              </div>
              <span className={styles.label}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={styles.line} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
