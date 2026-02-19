import { NextRequest, NextResponse } from "next/server";
import * as nodemailer from "nodemailer";


// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    if (!bodyText) {
      return NextResponse.json({ success: false, error: "Request body is empty" }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    let { to, cc, subject, text, html, from } = body;

    // Ensure required fields
    if (!to || !subject || !text) {
      return NextResponse.json({ success: false, error: "Missing required fields: to, subject, text" }, { status: 400 });
    }

    // Fallback to text if html empty
    if (!html) html = `<p>${text}</p>`;

    if (!from) from = process.env.EMAIL_FROM;

    const info = await transporter.sendMail({ from, to, cc, subject, text, html });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (err: any) {
    console.error("Nodemailer Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
