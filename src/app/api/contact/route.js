/**
 * app/api/contact/route.js
 * Handles contact form submissions.
 */

import { NextResponse } from "next/server";
import { saveContactMessage } from "@/lib/googleSheets";
import { sendContactNotification, sendContactReply } from "@/lib/sendMail";
import { validateEmail, validateName } from "@/lib/validators";

function clean(value, limit = 1000) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = clean(body.name, 180);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 80);
    const subject = clean(body.subject, 180);
    const message = clean(body.message, 1200);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (!validateName(name) || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid name or email address" },
        { status: 400 },
      );
    }

    const contactData = { name, email, phone, subject, message };
    await saveContactMessage(contactData);

    let notificationSent = false;
    let autoReplySent = false;
    try {
      await sendContactNotification(contactData);
      notificationSent = true;
    } catch (emailError) {
      console.error("Contact notification failed:", emailError);
    }

    try {
      await sendContactReply(email, subject, message);
      autoReplySent = true;
    } catch (emailError) {
      console.error("Contact auto-reply failed:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Message received. We will respond shortly.",
        logged: true,
        notificationSent,
        autoReplySent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit message",
      },
      { status: 500 },
    );
  }
}
