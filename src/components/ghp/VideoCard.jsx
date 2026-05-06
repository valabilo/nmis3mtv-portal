"use client";
/**
 * components/ghp/VideoCard.jsx
 *
 * Props:
 *   watched        {boolean}    Whether the video has been marked watched
 *   onMarkWatched {() => void} Callback when user marks as watched
 */

import styles from "./VideoCard.module.css";

export default function VideoCard({ watched, onMarkWatched }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3>Step 1 - Watch GHP Orientation Video</h3>
          <p>Required before you can take the qualification quiz</p>
        </div>
        <span
          className={`tag ${watched ? "tag-active" : "tag-pending"}`}
          style={{ marginLeft: "auto", flexShrink: 0 }}>
          {watched ? "Watched" : "Not Watched"}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.videoArea}>
          <iframe
            className={styles.videoPlayer}
            width="1013"
            height="570"
            src="https://www.youtube.com/embed/aItnGENOlHM"
            title=""
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <div className={styles.meta}>
          <span>
            <strong>Duration:</strong> 45 minutes
          </span>
          <span>
            <strong>Required:</strong> Yes
          </span>
          <span>
            <strong>Updated:</strong> 2025
          </span>
          {watched && <span className="tag tag-active">Watched</span>}
        </div>

        <div className={styles.note}>
          <strong>Note:</strong> This orientation covers proper sanitation,
          hygiene, and handling requirements for all Meat Transport Vehicles.
          Watching this video in full is a prerequisite before taking the
          qualification quiz.
        </div>

        {!watched && (
          <div className={styles.action}>
            <button className="btn btn-primary" onClick={onMarkWatched}>
              Mark as Watched &amp; Proceed to Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
