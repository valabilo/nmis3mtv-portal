import { Suspense } from "react";
import ApplicationStatusPanel from "@/components/apply/ApplicationStatusPanel";
import styles from "./status.module.css";

export const metadata = {
  title: "Application Status - MTV Portal",
};

export default function ApplicationStatusPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <h1>Application Status</h1>
          <p>Check the review status of your submitted MTV application.</p>
        </div>
      </div>
      <div className={styles.page}>
        <div className="container">
          <Suspense fallback={<div className="spinner" />}>
            <ApplicationStatusPanel />
          </Suspense>
        </div>
      </div>
    </>
  );
}
