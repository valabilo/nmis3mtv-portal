import styles from "./guidelines.module.css";

export const metadata = {
  title: "MTV Guidelines - MTV Portal",
};

const GUIDELINE_ITEMS = [
  {
    icon: "/images/icons/vehicle-safe.png",
    title: "Dedicated Use",
    content:
      "The Meat Transport Vehicle shall be used exclusively for the transport of meat to prevent cross-contamination from previous cargoes.",
  },
  {
    icon: "/images/icons/certificate.png",
    title: "Annual Validity",
    content:
      "The Certificate of Registration and official sticker remain valid for one (1) year from issuance unless sooner cancelled or revoked.",
  },
  {
    icon: "/images/icons/no-transfer.png",
    title: "Vehicle-Specific Registration",
    content:
      "The registration is non-transferable and applies only to the registered vehicle.",
  },
];

const QUICK_LINKS = [
  { href: "#general", label: "General Rules" },
  { href: "#markings", label: "Markings" },
  { href: "#curtains", label: "Plastic Curtains" },
  { href: "#photos", label: "Vehicle Photos" },
  { href: "#issuances", label: "References" },
];

const DISPLAY_RULES = [
  "For new applications, the assigned registration number must be displayed within one (1) month upon issuance of the COR.",
  "For renewal, the MTV shall be given a grace period to update the registration number.",
  "During the 30-day grace period, operations may continue while compliance is ongoing.",
  "Proof of compliance must be submitted to the RTOC office or NMIS personnel.",
];

const VEHICLE_PHOTOS = [
  {
    src: "/images/vehicle-photos/01-front-view.jpg",
    title: "Front View",
    note: "Plate number must be visible.",
  },
  {
    src: "/images/vehicle-photos/02-closed-back-view.jpg",
    title: "Closed Back View",
    note: "Show rear door condition and plate number.",
  },
  {
    src: "/images/vehicle-photos/03-opened-back-view.jpg",
    title: "Opened Back View",
    note: "Show cargo opening and rear access.",
  },
  {
    src: "/images/vehicle-photos/04-inside-view.jpg",
    title: "Inside View",
    note: "Cargo compartment must be clear and readable.",
  },
  {
    src: "/images/vehicle-photos/05-left-side-view.jpg",
    title: "Left Side View",
    note: "Capture the full side profile.",
  },
  {
    src: "/images/vehicle-photos/06-right-side-view.jpg",
    title: "Right Side View",
    note: "Capture the full side profile.",
  },
];

const MEMORANDUM_GROUPS = [
  {
    title: "Memorandum Circular",
    items: [
      {
        number: "Memorandum Circular No. 06-2024-19",
        detail: "Numbering of Registered MTV",
        url: "https://drive.google.com/file/d/1RMYkJZqYkWuZFVqGBCWU4_xi1t9a6Qxv/view",
      },
      {
        number: "Memorandum Circular No. 10-2020-021",
        detail:
          "Granting of Six (6) months transition period to conform with the use of chiller/reefer vans to be registered as NMIS Meat Transport Vehicle (MTV) effective up to March 2021",
      },
      {
        number: "Memorandum Circular No. 02-2017-002",
        detail: "Accreditation / Registration of Meat Transport Vehicle (MTV)",
      },
      {
        number: "Memorandum Circular No. 12-2015-016",
        detail:
          'Implementation of "No meat transport vehicle (MTV) accreditation" No Loading/Unloading Transport Policy',
      },
      {
        number: "1987 Memorandum Circular 001-87",
        detail:
          "Guidelines on the Use of Meat Inspection Certificates and Accredited Meat Vans",
        url: "https://nmis.gov.ph/images/pdf/mc-1987-001-87.pdf",
      },
    ],
  },
  {
    title: "Memorandum",
    items: [
      {
        number: "Memorandum No. 12-03-2015-16",
        detail: "Painting of MTV Accreditation Number",
      },
      {
        number: "Memorandum No. 0941",
        detail:
          "Adoption of unified certificate of accreditation of meat transport vehicle (MTV)",
      },
    ],
  },
  {
    title: "Memorandum Order",
    items: [
      {
        number: "Memorandum Order No. 05-2025-260",
        detail:
          "Revised Guidelines on the Numbering System for Meat Transport Vehicle (MTV) Registration",
      },
      {
        number: "Memorandum Order No. CO-07-2024-493",
        detail:
          "Reiterating the Implementation on Registering Meat Transport Vehicle for Meat Processed Products",
      },
      {
        number: "Memorandum Order No. CO-07-2024-454",
        detail:
          "Updated Policy on Signatory for NMIS MTV Certificate of Registration and Delineation of Responsibility for the Issuance of NMIS MTV Certificate of Registration (MTV COR)",
      },
    ],
  },
];

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

export default function GuidelinesPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>MTV Guidelines</h1>
          <p>Registration, marking, compliance, and vehicle photo guidance.</p>
        </div>
      </div>

      <main className={styles.page}>
        <div className="container">
          <section className={styles.overview}>
            <div className={styles.overviewCopy}>
              <span className={styles.kicker}>Operational Guide</span>
              <h2>Keep MTV registration, markings, and inspection photos aligned with NMIS requirements.</h2>
              <p>
                Use this page as a practical reference before submitting an MTV
                application or compliance update. It summarizes the core vehicle
                use rules, required markings, photo standards, and related
                issuances.
              </p>
            </div>
            <div className={styles.summaryGrid}>
              <div>
                <span>Validity</span>
                <strong>1 year</strong>
              </div>
              <div>
                <span>Registration</span>
                <strong>Per vehicle</strong>
              </div>
              <div>
                <span>Use</span>
                <strong>Meat transport only</strong>
              </div>
            </div>
          </section>

          <nav className={styles.quickNav} aria-label="Guidelines sections">
            {QUICK_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <section className={styles.band} id="general">
            <SectionHeading
              eyebrow="General Guidelines"
              title="Core MTV operating rules"
              text="These rules help preserve meat safety, traceability, and vehicle accountability during transport."
            />
            <div className={styles.guidelineGrid}>
              {GUIDELINE_ITEMS.map((item) => (
                <article key={item.title} className={styles.guidelineCard}>
                  <img src={item.icon} alt="" aria-hidden="true" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.band} id="markings">
            <SectionHeading
              eyebrow="MTV Markings"
              title="Registration number and compliance"
              text="Registered Meat Transport Vehicles must display the assigned number using the prescribed format for monitoring and identification."
            />
            <div className={styles.complianceLayout}>
              <figure className={styles.featureImage}>
                <img
                  src="/images/vehicle-photos/mtv-format.png"
                  alt="Example of MTV registration number format"
                />
              </figure>
              <div className={styles.compliancePanel}>
                <div className={styles.formatBlock}>
                  <span>Prescribed format</span>
                  <strong>NMIS-III-0001</strong>
                </div>
                <div className={styles.checklist}>
                  <div>
                    <span>01</span>
                    <p>Each MTV shall be assigned a unique registration number.</p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>The assigned number serves as the permanent identification of the vehicle.</p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>Operators must display the registration number following the prescribed format.</p>
                  </div>
                </div>
                <a
                  className={`btn btn-primary ${styles.complianceButton}`}
                  href="https://docs.google.com/forms/d/e/1FAIpQLScwXOm0nb0k8pgOjUDRiyO0IIVPjLRKSDDGgFMaXPzYA6TgTw/viewform"
                  target="_blank"
                  rel="noreferrer">
                  Submit Compliance
                </a>
              </div>
            </div>

            <div className={styles.ruleStrip}>
              {DISPLAY_RULES.map((rule, index) => (
                <article key={rule}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{rule}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.band} id="curtains">
            <SectionHeading
              eyebrow="Plastic Curtains"
              title="Rear opening and overlap requirements"
              text="Industrial plastic curtain or PVC strip plastic curtain must properly overlap and be placed near the rear opening, with curtain-to-floor distance kept close to 1 cm."
            />
            <div className={styles.mediaGridTwo}>
              <figure className={styles.photoFigure}>
                <img
                  src="/images/curtain-photos/curtain-1.png"
                  alt="PVC curtain overlapping detail"
                />
                <figcaption>PVC curtain overlapping detail</figcaption>
              </figure>
              <figure className={styles.photoFigure}>
                <img
                  src="/images/curtain-photos/curtain-2.png"
                  alt="Rear curtain placement"
                />
                <figcaption>Rear curtain placement</figcaption>
              </figure>
            </div>
          </section>

          <section className={styles.band} id="photos">
            <SectionHeading
              eyebrow="Vehicle Photos"
              title="Required photo angles for MTV applications"
              text="Upload clear photos that show the vehicle identity, plate number where required, and the cargo compartment condition."
            />
            <div className={styles.photoGrid}>
              {VEHICLE_PHOTOS.map((photo) => (
                <figure key={photo.title} className={styles.photoFigure}>
                  <img src={photo.src} alt={photo.title} />
                  <figcaption>
                    <strong>{photo.title}</strong>
                    <span>{photo.note}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className={styles.band} id="issuances">
            <SectionHeading
              eyebrow="Reference Issuances"
              title="Policy references and related memoranda"
              text="Open each group to review the issuances supporting MTV registration, numbering, marking, and certificate policies."
            />
            <div className={styles.memoGroups}>
              {MEMORANDUM_GROUPS.map((group) => (
                <details key={group.title} className={styles.memoGroup}>
                  <summary>{group.title}</summary>
                  <div className={styles.memoItems}>
                    {group.items.map((item) => (
                      <article key={item.number} className={styles.memoItem}>
                        <h3>
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noreferrer">
                              {item.number}
                            </a>
                          ) : (
                            item.number
                          )}
                        </h3>
                        <p>{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
