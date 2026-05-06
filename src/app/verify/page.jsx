"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMTVData } from "@/hooks/useMTVData";
import { useToast } from "@/hooks/useToast";
import VerifySearch from "@/components/verify/VerifySearch";
import DataTable from "@/components/ui/DataTable";
import StatusTag from "@/components/ui/StatusTag";
import Toast from "@/components/ui/Toast";
import styles from "./verify.module.css";

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const { data, loading, error } = useMTVData("accredited");
  const { toastState, showToast } = useToast();

  const columns = [
    { key: "plate", label: "Plate No.", render: (v) => <strong>{v}</strong> },
    { key: "business", label: "Business Name" },
    { key: "type", label: "Vehicle Type" },
    { key: "owner", label: "Owner" },
    { key: "expiry", label: "Expiry Date" },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusTag status={v || "Active"} />,
    },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Verify MTV</h1>
          <p>Check the accreditation status of a Meat Transport Vehicle.</p>
        </div>
      </div>

      <div className={styles.page}>
        <div className="container">
          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}
          <VerifySearch data={data} showToast={showToast} initialQ={initialQ} />
          <DataTable
            title="Accredited MTVs - Central Luzon Region"
            columns={columns}
            data={data}
            loading={loading}
            emptyText="No accredited MTVs found."
          />
        </div>
      </div>

      <Toast {...toastState} />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "80px auto" }} />}>
      <VerifyContent />
    </Suspense>
  );
}
