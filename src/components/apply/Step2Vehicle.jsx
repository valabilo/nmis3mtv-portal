"use client";
/**
 * components/apply/Step2Vehicle.jsx
 */

import styles from "./FormSteps.module.css";
import SelectField from "./SelectField";

const VEHICLE_TYPES = [
  "Refrigerated Truck",
  "Insulated Truck",
  "Closed Van",
  "Refrigerated Van",
  "Chiller / Freezer Van",
];
const MATERIALS = [
  "Stainless Steel",
  "Fiberglass",
  "Aluminum",
  "Food-grade Plastic",
  "Polyurethane Foam",
];

export default function Step2Vehicle({
  data,
  onChange,
  onBack,
  onNext,
  establishmentTypes = [],
  establishmentNames = [],
  loadingEstablishmentTypes = false,
  loadingEstablishmentNames = false,
  lockPlate = false,
}) {
  const selectedBusinessType = data.btype || "";
  const selectedEstablishment = data.meatEstablishment || "";
  const hasSelectedBusinessType =
    selectedBusinessType &&
    !establishmentTypes.some((item) => item.title === selectedBusinessType);
  const hasSelectedEstablishment =
    selectedEstablishment &&
    !establishmentNames.some((item) => item.title === selectedEstablishment);

  const f = (id, type = "text") => ({
    id,
    type,
    value: data[id] ?? "",
    onChange: (e) => onChange(id, e.target.value),
  });

  return (
    <div className={styles.body}>
      <h2 className={styles.sectionTitle}>Vehicle Information</h2>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="plate">
            Plate Number <span className="req">*</span>
          </label>
          <input
            placeholder="ABC 1234"
            style={{ textTransform: "uppercase" }}
            maxLength="20"
            disabled={lockPlate}
            {...f("plate")}
            onChange={(e) => {
              if (lockPlate) return;
              // Remove special characters and normalize
              const value = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9\s-]/g, ""); // Keep letters, numbers, spaces, hyphens
              onChange("plate", value);
            }}
          />
        </div>
        <div className="form-group">
          <SelectField
            id="vtype"
            label="Vehicle Type"
            required
            value={data.vtype}
            options={[
              { value: "", label: "-- Select Type --" },
              ...VEHICLE_TYPES.map((type) => ({
                value: type,
                label: type,
              })),
            ]}
            onChange={(value) => onChange("vtype", value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="vmake">
            Make / Brand <span className="req">*</span>
          </label>
          <input placeholder="e.g. Isuzu, Mitsubishi" {...f("vmake")} />
        </div>
        <div className="form-group">
          <label htmlFor="vmodel">
            Model <span className="req">*</span>
          </label>
          <input placeholder="e.g. Elf, Canter" {...f("vmodel")} />
        </div>
        <div className="form-group">
          <label htmlFor="vyear">
            Year Model <span className="req">*</span>
          </label>
          <input
            id="vyear"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="2020"
            maxLength="4"
            value={data.vyear ?? ""}
            onChange={(event) =>
              onChange("vyear", event.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="vcolor">Color</label>
          <input placeholder="White" {...f("vcolor")} />
        </div>
        <div className="form-group">
          <label htmlFor="vengine">Engine Number</label>
          <input placeholder="Engine number" {...f("vengine")} />
        </div>
        <div className="form-group">
          <label htmlFor="vchassis">Chassis Number</label>
          <input placeholder="Chassis number" {...f("vchassis")} />
        </div>
        <div className="form-group">
          <label htmlFor="crNumber">
            CR Number <span className="req">*</span>
          </label>
          <input
            placeholder="Certificate of Registration no."
            {...f("crNumber")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="orNumber">
            OR Number <span className="req">*</span>
          </label>
          <input placeholder="Official Receipt no." {...f("orNumber")} />
        </div>
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>
        Cargo Compartment
      </h2>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="cooling">Cooling Capacity</label>
          <input placeholder="e.g. 0°C to -18°C" {...f("cooling")} />
        </div>
        <div className="form-group">
          <label htmlFor="capacity">
            Load Capacity (kg) <span className="req">*</span>
          </label>
          <input
            type="number"
            placeholder="500"
            min="1"
            {...f("capacity", "number")}
          />
        </div>
        <div className="form-group">
          <SelectField
            id="material"
            label="Compartment Material"
            value={data.material}
            options={[
              { value: "", label: "-- Select --" },
              ...MATERIALS.map((material) => ({
                value: material,
                label: material,
              })),
            ]}
            onChange={(value) => onChange("material", value)}
          />
        </div>
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>
        Business Information
      </h2>
      <div className="form-grid">
        <div className="form-group">
          <SelectField
            id="btype"
            label="Business Type"
            required
            value={data.btype}
            options={[
              {
                value: "",
                label: loadingEstablishmentTypes
                  ? "Loading business types..."
                  : "-- Select Business Type --",
              },
              ...(hasSelectedBusinessType
                ? [{ value: selectedBusinessType, label: selectedBusinessType }]
                : []),
              ...establishmentTypes.map((item) => ({
                value: item.title,
                label: item.title,
              })),
            ]}
            onChange={(value) => onChange("btype", value)}
            disabled={loadingEstablishmentTypes}
          />
        </div>
        <div className="form-group">
          <SelectField
            id="meatEstablishment"
            label="Accredited Meat Establishment to be served"
            required
            value={data.meatEstablishment}
            options={[
              {
                value: "",
                label: loadingEstablishmentNames
                  ? "Loading establishments..."
                  : "-- Select Meat Establishment --",
              },
              ...(hasSelectedEstablishment
                ? [
                    {
                      value: selectedEstablishment,
                      label: selectedEstablishment,
                    },
                  ]
                : []),
              ...establishmentNames.map((item) => ({
                value: item.title,
                label: item.title,
              })),
            ]}
            onChange={(value) => onChange("meatEstablishment", value)}
            disabled={loadingEstablishmentNames}
          />
        </div>
        <div className="form-group">
          <label htmlFor="intendedRoute">
            Destination (major markets to be served){" "}
            <span className="req">*</span>
          </label>
          <input
            placeholder="Major markets, cities, or delivery areas"
            {...f("intendedRoute")}
          />
        </div>
      </div>

      <div className="form-footer">
        <button className="btn btn-outline" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Next: Documents
        </button>
      </div>
    </div>
  );
}
