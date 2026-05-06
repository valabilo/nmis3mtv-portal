"use client";
/**
 * components/ghp/QuizCard.jsx
 */

import { useState, useCallback, useEffect } from "react";
import styles from "./QuizCard.module.css";

export default function QuizCard({ unlocked, onPass, showToast }) {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const selectAnswer = useCallback(
    (qi, oi) => {
      if (!submitted) setAnswers((prev) => ({ ...prev, [qi]: oi }));
    },
    [submitted],
  );

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data) => setQuizData(data))
      .catch(() =>
        setError("Failed to load quiz questions. Please refresh the page."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>📝</div>
          <div className={styles.headerText}>
            <h3>Step 2 – Take the GHP Qualification Quiz</h3>
            <p>Loading quiz questions...</p>
          </div>
        </div>
        <div className={styles.body}>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            🔄 Loading quiz data...
          </div>
        </div>
      </div>
    );

  if (error || !quizData?.questions || !quizData?.config)
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>⚠️</div>
          <div className={styles.headerText}>
            <h3>Step 2 – Take the GHP Qualification Quiz</h3>
            <p>Quiz unavailable</p>
          </div>
        </div>
        <div className={styles.body}>
          <div style={{ textAlign: "center", padding: "2rem", color: "red" }}>
            {error ||
              "The quiz data could not be loaded. Please refresh the page."}
          </div>
        </div>
      </div>
    );

  const { questions, config } = quizData;
  const passThreshold = config?.passThreshold ?? 0.7;
  const totalQuestions = config?.totalQuestions ?? questions.length;
  const answered = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;

  function handleSubmit() {
    if (answered < totalQuestions) {
      showToast(
        `Please answer all ${totalQuestions - answered} remaining question(s).`,
        true,
      );
      return;
    }
    let correct = 0;
    questions.forEach((q, qi) => {
      if (answers[qi] === q.correct) correct++;
    });
    const pct = correct / totalQuestions;
    const passed = pct >= passThreshold;
    setScore({ correct, pct: Math.round(pct * 100), passed });
    setSubmitted(true);
    if (passed) onPass(correct, totalQuestions); // ← pass total back
  }

  function handleRetake() {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>📝</div>
        <div className={styles.headerText}>
          <h3>Step 2 – Take the GHP Qualification Quiz</h3>
          <p>
            Score at least {Math.round(passThreshold * 100)}% to qualify for
            your certificate
          </p>
        </div>
        <span
          className={`tag ${unlocked ? (score?.passed ? "tag-active" : "tag-pending") : "tag-locked"}`}
          style={{ marginLeft: "auto", flexShrink: 0 }}>
          {!unlocked ? "🔒 Locked" : score?.passed ? "✅ Passed" : "⏳ Pending"}
        </span>
      </div>

      <div className={styles.body}>
        {!unlocked && (
          <div className={styles.lockedMsg}>
            🔒&nbsp; Please watch the GHP orientation video first to unlock the
            quiz.
          </div>
        )}

        {unlocked && (
          <>
            <p className={styles.intro}>
              Answer all {totalQuestions} questions. You need at least{" "}
              <strong>
                {Math.ceil(totalQuestions * passThreshold)} correct answers (
                {Math.round(passThreshold * 100)}%)
              </strong>{" "}
              to pass.
            </p>

            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={answered}
              aria-valuemax={totalQuestions}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>

            {questions.map((q, qi) => (
              <div key={q.id} className={styles.question}>
                <p className={styles.questionText}>
                  <span className={styles.qNum}>
                    Question {qi + 1} of {totalQuestions}
                  </span>
                  {q.question}
                </p>
                <div className={styles.options}>
                  {q.options.map((opt, oi) => {
                    let cls = styles.option;
                    if (submitted) {
                      if (oi === q.correct) cls += ` ${styles.correct}`;
                      else if (oi === answers[qi] && oi !== q.correct)
                        cls += ` ${styles.wrong}`;
                    } else if (answers[qi] === oi) {
                      cls += ` ${styles.selected}`;
                    }
                    return (
                      <div
                        key={oi}
                        className={cls}
                        onClick={() => selectAnswer(qi, oi)}
                        role="radio"
                        aria-checked={answers[qi] === oi}
                        tabIndex={submitted ? -1 : 0}
                        onKeyDown={(e) =>
                          !submitted &&
                          e.key === "Enter" &&
                          selectAnswer(qi, oi)
                        }>
                        <div className={styles.radio} aria-hidden="true" />
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {!submitted && (
              <div className={styles.submitRow}>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Submit Quiz ✅
                </button>
              </div>
            )}

            {submitted && score && (
              <div
                className={`${styles.result} ${score.passed ? styles.resultPass : styles.resultFail}`}>
                <div className={styles.resultIcon}>
                  {score.passed ? "🎉" : "❌"}
                </div>
                <h4>
                  {score.passed
                    ? "Congratulations! You Passed!"
                    : "You Did Not Pass"}
                </h4>
                <div className={styles.scorePill}>
                  {score.correct}/{totalQuestions} correct · {score.pct}%
                </div>
                <p>
                  {score.passed
                    ? "Scroll down to claim your GHP Certificate of Completion."
                    : `You need at least ${Math.round(passThreshold * 100)}% to pass. You scored ${score.pct}%. Review the video and try again.`}
                </p>
                {!score.passed && (
                  <button
                    className="btn btn-outline"
                    style={{ marginTop: 16 }}
                    onClick={handleRetake}>
                    🔄 Retake Quiz
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
