import { REQUIRED_DOCS } from '@/data/requiredDocs'
import { getDownloadables } from '@/lib/downloadables'
import styles from './requirements.module.css'

export const metadata = {
  title: 'MTV Requirements - MTV Portal',
}

export const dynamic = 'force-dynamic'

const STEPS = [
  {
    title: 'GHP Orientation',
    text: 'Watch or attend the Good Hygiene Practices (GHP) seminar for drivers and porters.',
    icon: 'orientation',
    theme: 'blue',
  },
  {
    title: 'Submit Initial Documents',
    text: 'Hand over the initial documents to the Meat Inspection Officer (MIO). Bring your delivery van for inspection at the meat establishment.',
    icon: 'initialDocs',
    theme: 'teal',
  },
  {
    title: 'Submit Complete Requirements to NMIS',
    text: 'Once inspection is done, submit all complete documentary requirements to the NMIS Regional Technical Operations Center (RTOC).',
    icon: 'requirements',
    theme: 'green',
  },
  {
    title: 'Receive Order of Payment',
    text: 'NMIS will issue your Order of Payment after reviewing your documents.',
    icon: 'paymentOrder',
    theme: 'yellow',
  },
  {
    title: 'Pay Registration Fees',
    text: 'Pay the corresponding MTV registration fee.',
    icon: 'fees',
    theme: 'red',
  },
  {
    title: 'Receive Certificate & Sticker',
    text: 'After payment, receive the MTV Certificate of Registration and official MTV sticker to display on your vehicle.',
    icon: 'certificate',
    theme: 'navy',
  },
]

function StepIcon({ name }) {
  const common = {
    width: '28',
    height: '28',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  const icons = {
    orientation: (
      <svg {...common}>
        <path d="M4 19.5V5.7A2.7 2.7 0 0 1 6.7 3h10.6A2.7 2.7 0 0 1 20 5.7v13.8" />
        <path d="M7 8h10" />
        <path d="M7 12h6" />
        <path d="M8 21h8" />
        <path d="M10 16.5 12 18l3-4" />
      </svg>
    ),
    initialDocs: (
      <svg {...common}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h4" />
        <path d="M10 12h5" />
        <path d="M10 16h4" />
        <path d="M4 7v14h3" />
      </svg>
    ),
    requirements: (
      <svg {...common}>
        <path d="M8 4h8" />
        <path d="M9 2h6l1 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2z" />
        <path d="m8 12 2 2 4-5" />
        <path d="M8 18h8" />
      </svg>
    ),
    paymentOrder: (
      <svg {...common}>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h5" />
        <path d="M8 16h3" />
        <path d="m14 16 1.5 1.5L19 14" />
      </svg>
    ),
    fees: (
      <svg {...common}>
        <path d="M4 7h16v10H4z" />
        <path d="M7 10h.01" />
        <path d="M17 14h.01" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 20h12" />
      </svg>
    ),
    certificate: (
      <svg {...common}>
        <path d="M5 4h14v11H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h5" />
        <circle cx="17" cy="17" r="3" />
        <path d="m15.5 19.5-.8 2 2.3-.9 2.3.9-.8-2" />
      </svg>
    ),
  }

  return icons[name] ?? icons.requirements
}

function TruckIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h3.8l2.2 2.8V16h-6z" />
      <path d="M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M7.5 17h8" />
      <path d="M5 10h5" />
    </svg>
  )
}

export default async function RequirementsPage() {
  const downloadables = await getDownloadables()

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>MTV Requirements</h1>
          <p>Guide on how to register a Meat Transport Vehicle.</p>
        </div>
      </div>

      <main className={styles.page}>
        <div className="container">
          <section className={styles.overview}>
            <div>
              <span className={styles.kicker}>Registration Guide</span>
              <h2>Prepare the documents, inspection, payment, and final MTV certificate in one clear flow.</h2>
              <p>
                This page summarizes the registration steps, important reminders,
                required documents, and downloadable forms for Meat Transport
                Vehicle applicants.
              </p>
            </div>
            <div className={styles.summaryGrid}>
              <div>
                <span>Process</span>
                <strong>6 steps</strong>
              </div>
              <div>
                <span>Validity</span>
                <strong>Annual</strong>
              </div>
              <div>
                <span>Final Output</span>
                <strong>COR and sticker</strong>
              </div>
            </div>
          </section>

          <div className={styles.band}>Registration Flow</div>
          <section className={`${styles.panel} ${styles.guidePanel}`}>
            <h2 className={styles.guideTitle}>6 Easy Steps for MTV Registration</h2>
            <div className={styles.timeline} aria-hidden="true" />
            <div className={styles.truckBackdrop} aria-hidden="true">
              <div className={styles.truckCab} />
              <div className={styles.truckWheelOne} />
              <div className={styles.truckWheelTwo} />
            </div>
            <div className={styles.stepsInfographic}>
              {STEPS.map((step, index) => (
                <article key={step.title} className={`${styles.step} ${styles[step.theme]}`}>
                  <span className={styles.truckMarker}>
                    <TruckIcon />
                  </span>
                  <span className={styles.stepIcon}>
                    <StepIcon name={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className={styles.stepNumber}>Step {String(index + 1).padStart(2, '0')}</span>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.band}>Important Notes</div>
          <section className={styles.panel}>
            <ul className={styles.notes}>
              <li>Registration is annual. Apply at least two (2) months before expiration date.</li>
              <li>Always carry updated permits and sticker.</li>
              <li>Expired or unregistered MTV units are not allowed to load or unload meat products.</li>
            </ul>
          </section>

          <div className={styles.band}>List of Requirements</div>
          <section className={styles.panel}>
            <ol className={styles.requirements}>
              {REQUIRED_DOCS.map((doc) => (
                <li key={doc.id}>
                  <strong>{doc.name}</strong>
                  <br />
                  {doc.description}
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.band}>Downloadables</div>
          <section className={styles.panel}>
            {downloadables.length > 0 ? (
              <div className={styles.downloadGrid}>
                {downloadables.map((item) => (
                  <article key={item.href} className={styles.downloadCard}>
                    <div>
                      <span className={styles.fileType}>{item.type}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <a className={styles.downloadButton} href={item.href} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyDownloadables}>
                No downloadable files are available right now. Please check back later.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
