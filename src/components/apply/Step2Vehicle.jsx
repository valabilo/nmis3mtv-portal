"use client";
/**
 * components/apply/Step2Vehicle.jsx
 */

import styles from "./FormSteps.module.css";

const VEHICLE_TYPES = [
  "Refrigerated Truck",
  "Insulated Truck",
  "Closed Van",
  "Refrigerated Van",
  "Chiller / Freezer Van",
  "Motorcycle with Insulated Box",
];
const MATERIALS = [
  "Stainless Steel",
  "Fiberglass",
  "Aluminum",
  "Food-grade Plastic",
  "Polyurethane Foam",
];

export default function Step2Vehicle({ data, onChange, onBack, onNext }) {
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
            {...f("plate")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="vtype">
            Vehicle Type <span className="req">*</span>
          </label>
          <select
            id="vtype"
            value={data.vtype}
            onChange={(e) => onChange("vtype", e.target.value)}>
            <option value="">-- Select Type --</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
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
            type="number"
            placeholder="2020"
            min="1950"
            max="2030"
            {...f("vyear", "number")}
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
          <label htmlFor="crNumber">CR Number</label>
          <input
            placeholder="Certificate of Registration no."
            {...f("crNumber")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="orNumber">OR Number</label>
          <input placeholder="Official Receipt no." {...f("orNumber")} />
        </div>
        <div className="form-group">
          <label htmlFor="ltoClientId">LTO Client ID</label>
          <input placeholder="LTO client ID" {...f("ltoClientId")} />
        </div>
        <div className="form-group">
          <label htmlFor="fuelType">Fuel Type</label>
          <input
            placeholder="Diesel / Gasoline / Electric"
            {...f("fuelType")}
          />
        </div>
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>
        Cargo Compartment
      </h2>
      <div className="form-grid-3">
        <div className="form-group">
          <label htmlFor="cooling">Cooling Capacity</label>
          <input placeholder="e.g. 0 C to -18 C" {...f("cooling")} />
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
          <label htmlFor="grossWeight">Gross Weight (kg)</label>
          <input
            type="number"
            placeholder="3500"
            min="1"
            {...f("grossWeight", "number")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="netCapacity">Net Capacity (kg)</label>
          <input
            type="number"
            placeholder="2500"
            min="1"
            {...f("netCapacity", "number")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="material">Compartment Material</label>
          <select
            id="material"
            value={data.material}
            onChange={(e) => onChange("material", e.target.value)}>
            <option value="">-- Select --</option>
            {MATERIALS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="bodyType">Body Type</label>
          <input
            placeholder="Closed van, reefer body, etc."
            {...f("bodyType")}
          />
        </div>
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>
        Business Information
      </h2>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="meatEstablishment">
            Accredited Meat Establishment to be served{" "}
            <span className="req">*</span>
          </label>
          <input
            placeholder="Name of accredited meat establishment"
            {...f("meatEstablishment")}
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
