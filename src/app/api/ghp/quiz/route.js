/**
 * app/api/ghp/quiz/route.js
 * Handles GHP quiz submissions and certificate generation
 */

import { NextResponse } from "next/server";
import { GHP_QUIZ, calculateScore } from "@/data/ghpQuiz";
import { generateCertNumber } from "@/lib/certNumber";
import { saveGHPCompletion } from "@/lib/googleSheets";
import { sendGHPCompletion } from "@/lib/sendMail";

export async function GET() {
  // Return quiz questions
  return NextResponse.json(
    {
      success: true,
      quiz: GHP_QUIZ,
    },
    { status: 200 },
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { answers, name, email } = body;

    if (!answers || !name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: answers, name, email",
        },
        { status: 400 },
      );
    }

    // Calculate score
    const { score, passed, correct, total } = calculateScore(answers);

    let response = {
      success: true,
      score,
      correct,
      total,
      percentage: score,
      passed,
    };

    // If passed, generate certificate
    if (passed) {
      const certNumber = generateCertNumber();
      const issuedDate = new Date().toISOString().split("T")[0];

      // Save to Google Sheets
      const ghpData = {
        certNumber,
        name,
        email,
        score: correct,
        total,
        pct: score,
        issuedDate,
      };

      await saveGHPCompletion(ghpData);

      // Send email
      try {
        await sendGHPCompletion(email, name, certNumber, score);
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }

      response = {
        ...response,
        certificateNumber: certNumber,
        issuedDate,
        message: "Congratulations! You have completed the GHP orientation.",
      };
    } else {
      response.message = `You need ${GHP_QUIZ.passingScore}% to pass. You scored ${score}%.`;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process quiz",
      },
      { status: 500 },
    );
  }
}
