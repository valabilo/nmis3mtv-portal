"use client";

import { useMTVData } from "@/hooks/useMTVData";
import DataTable from "@/components/ui/DataTable";
import StatusTag from "@/components/ui/StatusTag";
import styles from "./banned.module.css";

export default function BannedPage() {
  const { data, loading, error } = useMTVData("banned");

  const columns = [
    { key: "plate", label: "Plate No.", render: (v) => <strong>{v}</strong> },
    { key: "business", label: "Business Name" },
    { key: "owner", label: "Owner" },
    { key: "reason", label: "Reason" },
    { key: "date", label: "Date Banned" },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusTag status={v || "Banned"} />,
    },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Banned / Suspended MTV List</h1>
          <p>Vehicles that have been banned, suspended, or revoked from operation.</p>
        </div>
      </div>

      <div className={styles.page}>
        <div className="container">
          <section className={styles.overview}>
            <div>
              <span className={styles.kicker}>Compliance Watchlist</span>
              <h2>Review vehicles restricted from loading, unloading, or operating.</h2>
              <p>
                Transacting with banned or suspended MTVs is a violation of meat
                safety regulations. Report suspicious activity to NMIS
                immediately.
              </p>
            </div>
            <div className={styles.warning}>
              <strong>Warning Notice</strong>
              <p>Always verify a vehicle before accepting meat transport service.</p>
            </div>
          </section>

          <DataTable
            title="Banned MTV Records"
            columns={columns}
            data={data}
            loading={loading}
            emptyText="No banned vehicles found."
          />
          {error && (
            <div className="form-error" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
