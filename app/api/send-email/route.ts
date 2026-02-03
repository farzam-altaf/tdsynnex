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
    const body = await request.json();
    const { to, subject, text, html, from } = body;

    // Validation
    if (!to || !subject || !text) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: to, subject, and text are required",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address format",
        },
        { status: 400 }
      );
    }

    let senderFrom = from || process.env.EMAIL_FROM;

    // Agar sirf name ho
    if (senderFrom && !senderFrom.includes("@")) {
      senderFrom = `${senderFrom} <${process.env.SMTP_USER}>`;
    }

    // // Send email
    // const info = await transporter.sendMail({
    //   from: senderFrom,
    //   to,
    //   subject,
    //   text,
    //   html: html || `<p>${text}</p>`,
    // });

    return NextResponse.json({
      success: true,
      // messageId: info.messageId,
      message: "Email not sent successfully",
    });
  } catch (error: any) {
    console.error("Nodemailer Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
