/**
 * app/api/quiz/route.js
 *
 * GET  /api/quiz
 * Returns quiz questions and config loaded from Google Sheets tabs:
 *   • Quiz_Questions  (id, question, option1-4, correct_index)
 *   • Quiz_Config     (key, value)
 *
 * Falls back to hardcoded questions when the sheet is unavailable
 * (e.g. during local dev without env vars).
 */

import { NextResponse } from "next/server";
import { readSheet } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

// ── Fallback questions (used when Sheets is unavailable) ──
const FALLBACK_QUESTIONS = [
  {
    id: 1,
    question:
      "What is the minimum temperature requirement for chilled meat transport?",
    options: ["0°C to 4°C", "0°C to 7°C", "-5°C to 0°C", "5°C to 10°C"],
    correct: 1,
  },
  {
    id: 2,
    question:
      "How often must meat transport vehicles be cleaned and sanitized?",
    options: [
      "Weekly",
      "Monthly",
      "After every use / before loading",
      "Only when visibly dirty",
    ],
    correct: 2,
  },
  {
    id: 3,
    question: "Which of the following is NOT allowed inside an MTV cargo area?",
    options: [
      "Stainless steel hooks",
      "Non-food items and chemicals",
      "Plastic crates with lids",
      "Ice packs",
    ],
    correct: 1,
  },
  {
    id: 4,
    question: "Who is responsible for ensuring meat hygiene during transport?",
    options: [
      "NMIS inspector only",
      "Slaughterhouse staff",
      "The accredited MTV operator/driver",
      "The buyer",
    ],
    correct: 2,
  },
  {
    id: 5,
    question:
      "What document must be carried by the MTV driver at all times during transport?",
    options: [
      "Driver's license only",
      "Vehicle registration only",
      "OR/CR, Insurance, and GHP Certificate",
      "No documents needed",
    ],
    correct: 2,
  },
];

const FALLBACK_CONFIG = {
  passThreshold: 0.7,
  totalQuestions: 5,
};

function normalizeAnswer(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getCorrectIndex(row, options) {
  const rawAnswer =
    row.correct_index ?? row.correct_answer ?? row.answer ?? row.correct ?? "";
  const numericAnswer = Number(rawAnswer);

  if (Number.isInteger(numericAnswer) && numericAnswer >= 0) {
    return numericAnswer < options.length ? numericAnswer : 0;
  }

  const answerText = normalizeAnswer(rawAnswer);
  const answerIndex = options.findIndex(
    (option) => normalizeAnswer(option) === answerText,
  );

  return answerIndex >= 0 ? answerIndex : 0;
}

export async function GET() {
  try {
    // ── Load Quiz_Questions ──
    const rows = await readSheet("Quiz_Questions");

    const questions = rows
      .filter((r) => r.question)
      .map((r, index) => {
        const options = [r.option1, r.option2, r.option3, r.option4].filter(
          Boolean,
        );

        return {
          id: r.id ? Number(r.id) : index + 1,
          question: r.question,
          options,
          correct: getCorrectIndex(r, options),
        };
      })
      .filter((q) => q.options.length > 0);

    // ── Load Quiz_Config ──
    const configRows = await readSheet("Quiz_Config");
    const configMap = {};
    configRows.forEach((r) => {
      if (r.key) configMap[r.key] = r.value;
    });

    const requestedTotal = parseInt(
      configMap["total_questions"] ?? questions.length,
      10,
    );
    const passThreshold = parseFloat(configMap["pass_threshold"] ?? 0.7);
    const sheetQuestions =
      requestedTotal > 0 ? questions.slice(0, requestedTotal) : questions;
    const finalQuestions = sheetQuestions.length
      ? sheetQuestions
      : FALLBACK_QUESTIONS;
    const config = {
      passThreshold: Number.isFinite(passThreshold) ? passThreshold : 0.7,
      totalQuestions: finalQuestions.length,
    };

    const finalConfig = config.totalQuestions ? config : FALLBACK_CONFIG;

    return NextResponse.json(
      { questions: finalQuestions, config: finalConfig },
      { status: 200 },
    );
  } catch (err) {
    console.warn("Quiz sheet unavailable, using fallback:", err.message);
    return NextResponse.json(
      { questions: FALLBACK_QUESTIONS, config: FALLBACK_CONFIG },
      { status: 200 },
    );
  }
}
