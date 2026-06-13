"use client";
/**
 * components/ghp/VideoCard.jsx
 *
 * Props:
 *   watched        {boolean}    Whether the video has been marked watched
 *   onMarkWatched {() => void} Callback when user marks as watched
 */

import { useEffect, useRef } from "react";
import styles from "./VideoCard.module.css";

export default function VideoCard({ watched, onMarkWatched }) {
  const playerRef = useRef(null);

  useEffect(() => {
    // Load YouTube IFrame Player API if not already loaded
    if (!window.YT) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }

    // Initialize player when API is ready
    const initPlayer = () => {
      if (window.YT && window.YT.Player && !playerRef.current) {
        playerRef.current = new window.YT.Player("youtube-player", {
          videoId: "ef3Xs527QVI",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
          },
          events: {
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED && !watched) {
                onMarkWatched();
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [watched, onMarkWatched]);

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
          {watched ? "✅ Watched" : "⏳ Not Watched"}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.videoArea}>
          <div id="youtube-player" className={styles.videoPlayer}></div>
        </div>

        <div className={styles.meta}>
          <span>
            <strong>Duration:</strong> 45 minutes
          </span>
          <span>
            <strong>Required:</strong> Yes
          </span>
          <span>
            <strong>Updated:</strong> 2026
          </span>
          {watched && <span className="tag tag-active">✅ Watched</span>}
        </div>

        <div className={styles.note}>
          <strong>Note:</strong> This orientation covers proper sanitation,
          hygiene, and handling requirements for all Meat Transport Vehicles.
          Watching this video in full is a prerequisite before taking the
          qualification quiz.
        </div>

        {!watched ? (
          <div className={styles.action}>
            <button className="btn btn-primary" onClick={onMarkWatched}>
              ✅ Mark as Watched &amp; Proceed to Quiz
            </button>
          </div>
        ) : (
          <div className={styles.action}>
            <div
              style={{
                background: "var(--green-pale)",
                border: "1px solid var(--green)",
                borderRadius: "8px",
                padding: "14px 18px",
                fontSize: ".9rem",
                color: "var(--green)",
                fontWeight: 700,
                textAlign: "center",
              }}>
              ✅ Video marked as watched — scroll down to take the quiz
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
