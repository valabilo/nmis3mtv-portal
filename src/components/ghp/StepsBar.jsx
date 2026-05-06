/**
 * components/ghp/StepsBar.jsx
 * 3-step GHP progress indicator.
 */
import styles from './StepsBar.module.css'

const STEPS = [
  { icon: '▶️', label: 'Watch\nOrientation' },
  { icon: '📝', label: 'Take\nQuiz'         },
  { icon: '🎓', label: 'Get\nCertificate'   },
]

export default function StepsBar({ currentStep = 1 }) {
  return (
    <div className={styles.bar} role="list" aria-label="GHP completion steps">
      {STEPS.map((s, i) => {
        const num      = i + 1
        const isDone   = num < currentStep
        const isActive = num === currentStep
        return (
          <div key={i} className={styles.stepGroup} role="listitem">
            <div className={[
              styles.stepItem,
              isDone   ? styles.done   : '',
              isActive ? styles.active : '',
              !isDone && !isActive ? styles.locked : '',
            ].join(' ')}>
              <div className={styles.circle} aria-hidden="true">
                {isDone ? '✓' : s.icon}
              </div>
              <div className={styles.label}>
                {s.label.split('\n').map((line, j) => (
                  <span key={j}>{line}{j === 0 ? <br /> : null}</span>
                ))}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
